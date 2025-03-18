// lib_login/authMiddleware.js
const { hasPageAccess } = require('./permissions');
const { queryDatabase } = require('./db');

// permissions.json 파일 가져오기 추가
const fs = require('fs');
const path = require('path');
const permissionsPath = path.join(__dirname, './permissions.json');
const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));

// 기본 사용자 인증 미들웨어
const authenticateUser = (req, res, next) => {
  if (req.session && req.session.is_logined) {
    // 세션이 존재하고 로그인 상태이면 다음 미들웨어로 진행
    next();
  } else {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    res.redirect('/auth/login');
  }
};

const checkAdminRole = async (req, res, next) => {
    console.log('Checking admin role', {
        session: req.session,
        isLoggedIn: req.session?.is_logined,
        userRole: req.session?.role
    });

    if (!req.session?.is_logined) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    try {
        const [user] = await queryDatabase(
            'SELECT role FROM Users WHERE userID = ?',
            [req.session.userID]
        );

        if (user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin privileges required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during authentication'
        });
    }
};

function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.session.is_logined) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.'
            });
        }

        const userRole = req.session.role;
        
        // 디버깅 로그 추가
        console.log('현재 사용자 역할:', userRole);
        console.log('허용된 역할:', allowedRoles);
        console.log('권한 확인 결과:', allowedRoles.includes(userRole));
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                error: '접근 권한이 없습니다.'
            });
        }

        next();
    };
}

function checkPageAccess(requiredPage) {
    return async (req, res, next) => {
        if (!req.session?.is_logined) {
            return res.redirect('/auth/login');
        }

        const userRole = req.session.role;
        
        // 디버깅 로그 추가
        console.log('현재 사용자 역할:', userRole);
        console.log('요청한 페이지:', requiredPage);
        
        // permissions.json에서 해당 페이지에 필요한 역할 확인
        const requiredRoles = permissions.pages[requiredPage]?.roles || [];
        console.log('페이지에 필요한 역할:', requiredRoles);
        console.log('권한 확인 결과:', requiredRoles.includes(userRole));
        
        if (!hasPageAccess(userRole, requiredPage)) {
            // 403.ejs 파일이 없는 경우 대비
            try {
                return res.status(403).render('403', {
                    message: '이 페이지에 대한 접근 권한이 없습니다.'
                });
            } catch (error) {
                console.error('Error rendering 403 page:', error);
                return res.status(403).send('이 페이지에 대한 접근 권한이 없습니다.');
            }
        }

        next();
    };
}

module.exports = { 
    authenticateUser,
    checkPageAccess,
    checkRole,
    checkAdminRole
};