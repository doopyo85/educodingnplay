const express = require('express');
const router = express.Router();
const templateModule = require('./template');
const db = require('./db');
const bcrypt = require('bcrypt');
const authCheck = require('./authCheck');

// 로그인 화면 라우팅
router.get('/login', (req, res) => {
    const title = '로그인';
    const html = templateModule.HTML(title, `
        <form id="loginForm">
            <p><input class="login" type="text" name="username" placeholder="아이디"></p>
            <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
            <p><input class="btn" type="submit" value="로그인"></p>
        </form>
        <p>계정이 없으신가요? <a href="/template/register">회원가입</a></p>
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
                        } else {
                            alert('로그인 실패: ' + response.error);
                        }
                    },
                    error: function(xhr, status, error) {
                        alert('오류: ' + xhr.responseJSON.error);
                    }
                });
            });
        });
        </script>
    `, authCheck.statusUI(req, res));
    res.send(html);
});

// 로그인 처리
router.post('/login_process', async (req, res) => {
    try {
        const { username, pwd } = req.body;

        if (!username || !pwd) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
        }

        const user = await new Promise((resolve, reject) => {
            const query = 'SELECT * FROM Users WHERE username = ?';
            db.query(query, [username], async (error, results) => {
                if (error) return reject(error);
                if (results.length === 0) return resolve(null);

                const user = results[0];
                const match = await bcrypt.compare(pwd, user.password);
                if (match) {
                    resolve(user);
                } else {
                    resolve(null);
                }
            });
        });

        if (user) {
            req.session.is_logined = true;
            req.session.nickname = user.nickname;
            req.session.save(err => {
                if (err) {
                    return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
                }
                res.json({ success: true, redirect: '/public' });
            });
        } else {
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ error: '서버 오류' });
    }
});

module.exports = router;
