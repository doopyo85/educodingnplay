const express = require('express');
const router = express.Router();
const template = require('./template.js');
const db = require('./db');

router.get('/login', (request, response) => {
    const title = '로그인';
    const html = template.HTML(title, `
        <h2>로그인</h2>
        <form id="loginForm">
            <p><input class="login" type="text" name="username" placeholder="아이디"></p>
            <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
            <p><input class="btn" type="submit" value="로그인"></p>
        </form>
        <p>계정이 없으신가요? <a href="/auth/register">회원가입</a></p>
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script>
        $(document).ready(function() {
            $('#loginForm').on('submit', function(e) {
                e.preventDefault();
                $.ajax({
                    url: '/auth/login_process',
                    method: 'POST',
                    data: $(this).serialize(),
                    success: function(response) {
                        if (response.success) {
                            window.location.href = response.redirect;
                        }
                    },
                    error: function(xhr, status, error) {
                        alert(xhr.responseJSON.error);
                    }
                });
            });
        });
        </script>
    `, '');
    response.send(html);
});

router.post('/login_process', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.pwd;

        console.log('로그인 시도:', { username, password });

        if (!username || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
        }

        const user = await getUserByUsernameAndPassword(username, password);
        
        if (user) {
            req.session.is_logined = true;
            req.session.nickname = user.nickname;
            req.session.save(err => {
                if (err) {
                    console.error('세션 저장 오류:', err);
                    return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
                }
                console.log('로그인 성공:', user.nickname);
                res.json({ success: true, redirect: '/public' });
            });
        } else {
            console.log('로그인 실패: 사용자 정보를 찾을 수 없음');
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('로그인 처리 중 오류 발생:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

// 새로 추가된 회원가입 라우트
router.get('/register', (req, res) => {
    const title = '회원가입';
    const html = template.HTML(title, `
        <h2>회원가입</h2>
        <form action="/auth/register_process" method="post">
            <p><input class="login" type="text" name="username" placeholder="아이디" required></p>
            <p><input class="login" type="password" name="password" placeholder="비밀번호" required></p>
            <p><input class="login" type="email" name="email" placeholder="이메일" required></p>
            <p><input class="login" type="text" name="nickname" placeholder="닉네임" required></p>
            <p><input class="btn" type="submit" value="가입하기"></p>
        </form>
        <p>이미 계정이 있으신가요? <a href="/auth/login">로그인</a></p>
    `, '');
    res.send(html);
});

// 회원가입 처리 라우트
router.post('/register_process', async (req, res) => {
    try {
        const { username, password, email, nickname } = req.body;

        // 간단한 유효성 검사
        if (!username || !password || !email || !nickname) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }

        // 사용자 생성
        await createUser(username, password, email, nickname);

        res.redirect('/auth/login');
    } catch (error) {
        console.error('회원가입 처리 중 오류 발생:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

async function getUserByUsernameAndPassword(username, password) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM userTable WHERE username = ? AND password = ?', [username, password], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0 ? results[0] : null);
            }
        });
    });
}

async function createUser(username, password, email, nickname) {
    return new Promise((resolve, reject) => {
        db.query('INSERT INTO userTable (username, password, email, nickname) VALUES (?, ?, ?, ?)', 
            [username, password, email, nickname], 
            (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            }
        );
    });
}

module.exports = router;