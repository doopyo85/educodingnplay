// routes/admin.js
const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../lib_login/db');
const { getSheetData } = require('../server');
const fs = require('fs').promises;
const path = require('path');


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
        role: req.session.role  // role 정보 추가
    });
});


// 권한 설정 가져오기
router.post('/api/permissions', checkAdminRole, async (req, res) => {
    try {
        const { permissions } = req.body;
        const permissionsPath = path.join(__dirname, '../lib_login/permissions.json');
        
        await fs.writeFile(permissionsPath, JSON.stringify(permissions, null, 2));
        
        // 캐시 업데이트
        require('../lib_login/permissions').updatePermissionCache(permissions);
        
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

// 권한 설정 저장
router.post('/api/permissions', checkAdminRole, async (req, res) => {
    try {
        const { permissions } = req.body;
        const permissionsPath = path.join(__dirname, '../lib_login/permissions.json');
        
        await fs.writeFile(permissionsPath, JSON.stringify(permissions, null, 2));
        
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


// 통계 데이터 API
router.get('/api/stats', checkAdminRole, async (req, res) => {
    try {
        // 디버깅용 로그 추가
        console.log('Session:', req.session);
        console.log('User:', req.session?.userID);
        console.log('Role:', req.session?.role);

        // 센터 정보 가져오기
        const centerData = await getSheetData('센터목록!A2:B');
        const centerMap = new Map(centerData.map(row => [row[0].toString(), row[1]]));
        
        console.log('Center data:', centerData);  // centerResponse.data 대신 centerData로 변경

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
        console.log('Center stats query result:', centerStats);

       // 센터 통계에 센터명 추가
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

// 사용자 목록 API
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

        const users = await queryDatabase(usersQuery);  // 여기서 users 변수 정의
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

// routes/admin.js
router.get('/api/pages', checkAdminRole, async (req, res) => {
    try {
        console.log('Fetching pages for permission matrix');
        // 현재 시스템의 모든 페이지 목록
        const systemPages = {
            "/": { name: "메인 페이지" },
            "/admin": { name: "관리자 대시보드" },
            "/kinder": { name: "유치원" },
            "/school": { name: "학교" },
            "/computer": { name: "컴퓨터 학습" },
            "/books": { name: "교재 학습" },
            "/scratch_project": { name: "스크래치" },
            "/entry_project": { name: "엔트리" },
            "/test": { name: "테스트" }
        };

        console.log('System pages:', systemPages);

        // 현재 권한 설정 가져오기
        const currentPermissions = await queryDatabase(
            'SELECT page_path, role FROM page_permissions'
        );
        
        console.log('Current permissions:', currentPermissions);

        // 페이지별 권한 정보 구성
        const pagesWithPermissions = Object.entries(systemPages).reduce((acc, [path, info]) => {
            acc[path] = {
                name: info.name,
                roles: currentPermissions
                    .filter(p => p.page_path === path)
                    .map(p => p.role)
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

module.exports = router;