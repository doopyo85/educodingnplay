// routes/admin.js
const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../lib_login/db');

// 관리자 권한 체크 미들웨어
const checkAdminRole = async (req, res, next) => {
    if (!req.session?.is_logined) {
        console.log('Not logged in');
        return res.redirect('/auth/login');
    }

    try {
        const [user] = await queryDatabase(
            'SELECT role FROM Users WHERE userID = ?',
            [req.session.userID]
        );

        if (user?.role !== 'manager') {
            return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
};

// 대시보드 페이지 렌더링
router.get('/', checkAdminRole, (req, res) => {
    res.render('admin/dashboard', {
        userID: req.session.userID,
        is_logined: req.session.is_logined,
        role: req.session.role  // role 정보 추가
    });
});

// 통계 데이터 API
router.get('/api/stats', checkAdminRole, async (req, res) => {
    try {
        if (!req.session?.is_logined) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        // Users 테이블에서 통계 추출
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
                COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
                COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
                COUNT(DISTINCT centerID) as active_centers
            FROM Users
            WHERE centerID IS NOT NULL
        `;
        
        const [stats] = await queryDatabase(statsQuery);
        console.log('Basic stats:', stats);

        // 센터별 통계
        const centerQuery = `
            SELECT 
                centerID,
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
                COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
                COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count
            FROM Users
            WHERE centerID IS NOT NULL
            GROUP BY centerID
        `;
        
        const centerStats = await queryDatabase(centerQuery);
        console.log('Center stats:', centerStats);
        
        // routes/admin.js의 센터 통계 쿼리 수정
        const centerStatsQuery = `
            SELECT 
                u1.centerID,
                MAX(CASE WHEN u2.role = 'manager' THEN u2.name END) as centerName,
                COUNT(DISTINCT u1.id) as total_users,
                SUM(CASE WHEN u1.role = 'student' THEN 1 ELSE 0 END) as student_count,
                SUM(CASE WHEN u1.role = 'manager' THEN 1 ELSE 0 END) as manager_count,
                SUM(CASE WHEN u1.role = 'teacher' THEN 1 ELSE 0 END) as teacher_count
            FROM Users u1
            LEFT JOIN Users u2 ON u1.centerID = u2.centerID
            WHERE u1.centerID IS NOT NULL
            GROUP BY u1.centerID
        `;

        res.json({
            success: true,
            data: {
                totalStats: {
                    total_users: stats.total_users || 0,
                    student_count: stats.student_count || 0,
                    manager_count: stats.manager_count || 0,
                    teacher_count: stats.teacher_count || 0,
                    active_centers: stats.active_centers || 0
                },
                centerStats: centerStats || []
            }
        });

    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 사용자 목록 API
router.get('/api/users', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching users list...');
        const usersQuery = `
            SELECT 
                u1.id, u1.userID, u1.email, u1.name, u1.phone, 
                u1.birthdate, u1.role, u1.created_at, u1.centerID,
                u2.name as centerName
            FROM Users u1
            LEFT JOIN Users u2 ON u1.centerID = u2.centerID AND u2.role = 'manager'
            ORDER BY u1.created_at DESC
        `;
        
        const users = await queryDatabase(usersQuery);
        console.log(`Found ${users.length} users`);
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});



module.exports = router;