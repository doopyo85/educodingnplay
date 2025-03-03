const express = require('express');
const router = express.Router();
const authenticateUser = require('../lib_login/authMiddleware').authenticateUser;

// 홈 라우트
router.get('/', (req, res) => {
    if (!req.session.is_logined) {
        res.redirect('/auth/login');
    } else {
        res.render('index');
    }
});

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('로그아웃 실패');
        }
        res.clearCookie('token', { domain: '.codingnplay.co.kr', path: '/' });
        res.redirect('/auth/login');
    });
});

// 교사 교육 사이트
router.get('/teacher', (req, res) => {
    res.render('teacher');
});

// 파이썬 프로젝트
router.get('/python', authenticateUser, (req, res) => {
    res.render('python_project');
});

module.exports = router;
