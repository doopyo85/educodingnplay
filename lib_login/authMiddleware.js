// authMiddleware.js
const { hasPageAccess } = require('./permissions');

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

module.exports = { checkPageAccess };