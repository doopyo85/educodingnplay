const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getUserByUserID, createUser } = require('./db');  // db.js에서 가져옴

// 로그인 페이지 GET
router.get('/login', (req, res) => {
    res.render('login');
});

// 로그인 처리 POST
router.post('/login_process', async (req, res) => {
    const { userID, password } = req.body;
    try {
        const user = await getUserByUserID(userID);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.is_logined = true;
            req.session.userID = user.userID;
            req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: '세션 저장 오류' });
                }
                res.json({ success: true, redirect: '/' });
            });
        } else {
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '서버 내부 오류' });
    }
});

// 회원가입 페이지 GET
router.get('/register', (req, res) => {
    res.render('register');
});

// 회원가입 처리 POST
router.post('/register_process', async (req, res) => {
    const { userID, password, email, name, phone, birthdate, role, centerID } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const existingUser = await getUserByUserID(userID);
        if (existingUser) return res.status(400).json({ error: '이미 존재하는 ID' });
        await createUser(userID, hashedPassword, email, name, phone, birthdate, role, centerID);
        res.json({ success: true, message: '회원가입 성공' });
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

module.exports = router;
