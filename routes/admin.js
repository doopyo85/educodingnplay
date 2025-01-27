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
// routes/admin.js
router.get('/api/stats', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching admin stats...');
        
        // 전체 통계 쿼리
        const totalStatsQuery = `
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) as total_activities,
                COUNT(DISTINCT DATE(created_at)) as active_days
            FROM UserActivityLogs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;
        console.log('Total stats query:', totalStatsQuery);
        
        const [totalStats] = await queryDatabase(totalStatsQuery);
        console.log('Total stats result:', totalStats);

        // Users 테이블에서 직접 사용자 수 가져오기
        const userCountQuery = 'SELECT COUNT(*) as user_count FROM Users';
        const [userCount] = await queryDatabase(userCountQuery);
        console.log('User count:', userCount);

        // 센터별 통계
        const centerStatsQuery = `
            SELECT 
                centerID,
                COUNT(*) as user_count,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as student_count,
                SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_count,
                SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as teacher_count
            FROM Users
            WHERE centerID IS NOT NULL
            GROUP BY centerID
        `;
        console.log('Center stats query:', centerStatsQuery);
        
        const centerStats = await queryDatabase(centerStatsQuery);
        console.log('Center stats result:', centerStats);

        // 최근 활동 통계
        const recentActivityQuery = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM UserActivityLogs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;
        console.log('Recent activity query:', recentActivityQuery);
        
        const recentActivity = await queryDatabase(recentActivityQuery);
        console.log('Recent activity result:', recentActivity);

        res.json({
            success: true,
            data: {
                totalStats: {
                    total_users: userCount.user_count,
                    total_activities: totalStats?.total_activities || 0,
                    active_days: totalStats?.active_days || 0
                },
                centerStats,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
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
        console.log('Users query:', usersQuery);
        
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