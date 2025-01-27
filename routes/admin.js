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
        console.log('Fetching stats...'); // 디버깅용 로그

        // 전체 통계
        const [totalStats] = await queryDatabase(`
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                COUNT(*) as total_activities,
                COUNT(DISTINCT DATE(created_at)) as active_days
            FROM UserActivityLogs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        // 일별 활동 통계
        const dailyStats = await queryDatabase(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as activity_count
            FROM UserActivityLogs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // 메뉴별 접근 통계
        const menuStats = await queryDatabase(`
            SELECT 
                menu_name,
                COUNT(*) as access_count,
                AVG(duration) as avg_duration
            FROM MenuAccessLogs
            WHERE access_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY menu_name
            ORDER BY access_count DESC
            LIMIT 10
        `);

        // 센터별 활동 통계
        const centerStats = await queryDatabase(`
            SELECT 
                u.centerID,
                COUNT(DISTINCT l.user_id) as active_users,
                COUNT(*) as activity_count
            FROM UserActivityLogs l
            JOIN Users u ON l.user_id = u.id
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY u.centerID
            ORDER BY activity_count DESC
        `);

        // 하나의 응답으로 모든 데이터 전송
        console.log('Sending stats response...'); // 디버깅용 로그
        res.json({
            success: true,
            data: {
                totalStats: {
                    total_users: totalStats?.total_users || 0,
                    total_activities: totalStats?.total_activities || 0,
                    active_days: totalStats?.active_days || 0
                },
                dailyStats: dailyStats || [],
                menuStats: menuStats || [],
                centerStats: centerStats || []
            }
        });

    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;