const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../lib_login/db');
const { getSheetData } = require('../server');
const fs = require('fs').promises;
const path = require('path');
const { hasAccess } = require('../lib_login/permissions'); // 권한 체크 함수 사용
const permissions = require('../lib_login/permissions.json'); // JSON 권한 데이터 불러오기

// 관리자 권한 체크 미들웨어
const checkAdminRole = async (req, res, next) => {
    console.log('Checking admin role...');
    console.log('Session:', req.session);

    if (!req.session?.is_logined) {
        console.log('Not logged in');
        return res.redirect('/auth/login');
    }

    try {
        const [user] = await queryDatabase(
            'SELECT role FROM Users WHERE userID = ?',
            [req.session.userID]
        );

        console.log('User role check:', user);

        if (user?.role !== 'admin') {
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
        role: req.session.role // role 정보 추가
    });
});

// 권한 설정 저장 (permissions.json 업데이트)
router.post('/api/permissions', checkAdminRole, async (req, res) => {
    try {
        const { permissions: updatedPermissions } = req.body;
        const permissionsPath = path.join(__dirname, '../lib_login/permissions.json');

        await fs.writeFile(permissionsPath, JSON.stringify(updatedPermissions, null, 2));

        // 캐시 업데이트
        require('../lib_login/permissions').updatePermissionCache(updatedPermissions);

        res.json({
            success: true,
            message: '권한 설정이 저장되었습니다.'
        });
    } catch (error) {
        console.error('Error saving permissions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 사용자 목록 API 복원
router.get('/api/users', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching users list...');
        
        // 구글 시트에서 센터 정보 가져오기
        const centerData = await getSheetData('센터목록!A2:C');
        const centerMap = new Map(centerData.map(row => [row[0].toString(), row[1]]));

        // 사용자 정보 조회
        const usersQuery = `
            SELECT 
                id, userID, email, name, phone, 
                birthdate, role, created_at, centerID
            FROM Users
            ORDER BY created_at DESC
        `;

        const users = await queryDatabase(usersQuery);
        console.log(`Found ${users.length} users`);

        // 사용자 정보에 센터명과 일련번호 추가
        const usersWithDetails = users.map((user, index) => ({
            no: index + 1,
            ...user,
            centerName: user.centerID ? centerMap.get(user.centerID.toString()) || '미지정' : '-',
            birthdate: user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : null
        }));

        res.json({
            success: true,
            data: usersWithDetails
        });

    } catch (error) {
        console.error('Users API error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});


// 페이지별 권한 확인 API (permissions.js 사용)
router.get('/api/pages', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching pages for permission matrix');

        // JSON 파일에 정의된 모든 페이지
        const systemPages = permissions.pages; // permissions.json에 정의된 페이지와 권한

        const pagesWithPermissions = Object.entries(systemPages).reduce((acc, [path, info]) => {
            acc[path] = {
                name: info.name,
                roles: info.roles // JSON에서 roles 가져오기
            };
            return acc;
        }, {});

        console.log('Response data:', pagesWithPermissions);

        res.json({
            success: true,
            data: pagesWithPermissions
        });
    } catch (error) {
        console.error('Error in /api/pages:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 통계 데이터 API
router.get('/api/stats', checkAdminRole, async (req, res) => {
    try {
        console.log('Session:', req.session);

        // 센터 정보 가져오기
        const centerData = await getSheetData('센터목록!A2:B');
        const centerMap = new Map(centerData.map(row => [row[0].toString(), row[1]]));

        console.log('Center data:', centerData);

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

        const centerStatsWithNames = centerStats.map(stat => ({
            ...stat,
            centerName: centerMap.get(stat.centerID.toString()) || '미지정'
        }));

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
                centerStats: centerStatsWithNames || []
            }
        });
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
