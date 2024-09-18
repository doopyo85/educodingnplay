const express = require('express');
const router = express.Router();
const db = require('./db'); // 데이터베이스 연결
const bcrypt = require('bcrypt'); // 비밀번호 해싱
const saltRounds = 10;

// 로그인 페이지 GET
router.get('/login', (req, res) => {
    res.render('login');
});

// 로그인 POST
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.getUserByUsername(username);
    
    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        return res.redirect('/');
    } else {
        return res.status(401).send('로그인 실패');
    }
});

// 회원가입 페이지 GET
router.get('/register', (req, res) => {
    res.render('register');
});

// 회원가입 POST
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    try {
        await db.createUser(username, hashedPassword);
        res.redirect('/auth/login');
    } catch (error) {
        console.error('회원가입 중 오류:', error);
        res.status(500).send('회원가입 중 오류가 발생했습니다.');
    }
});

module.exports = router;
