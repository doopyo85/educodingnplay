// lib_login/authMiddleware.js
const { hasPageAccess } = require('./permissions');
const { queryDatabase } = require('./db');

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
        if (!hasPageAccess(userRole, requiredPage)) {
            return res.status(403).render('403', {
                message: '이 페이지에 대한 접근 권한이 없습니다.'
            });
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