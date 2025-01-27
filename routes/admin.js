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
        is_logined: req.session.is_logined
    });
});

// 통계 데이터 API
router.get('/api/stats', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching admin stats...');
        
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
                id, userID, email, name, phone, 
                birthdate, role, created_at, centerID
            FROM Users
            ORDER BY created_at DESC
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