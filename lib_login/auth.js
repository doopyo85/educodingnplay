const express = require('express');
const router = express.Router();
const db = require('./db'); // 데이터베이스 연결
const bcrypt = require('bcrypt'); // 비밀번호 해싱
const saltRounds = 10;

// 로그인 페이지 GET
router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/login', (req, res) => {
    res.render('login'); // login.ejs 파일을 렌더링
});


router.post('/login_process', async (req, res) => {
    const { userID, password } = req.body;
    try {
        const user = await getUserByUserID(userID);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.is_logined = true;
            req.session.userID = user.userID;
            req.session.save((err) => {
                if (err) {
                    return res.status(500).json({ error: '세션 저장 중 오류가 발생했습니다.' });
                }
                res.json({ success: true, redirect: '/' });
            });
        } else {
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('Login process error:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
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
