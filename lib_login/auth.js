const express = require('express');
const router = express.Router();
const template = require('./template.js');
const db = require('./db'); // db.js 파일을 가져옵니다.

router.get('/login', (request, response) => {
    const title = '로그인';
    const html = template.HTML(title, `
            <h2>로그인</h2>
            <form action="/auth/login_process" method="post">
            <p><input class="login" type="text" name="username" placeholder="아이디"></p>
            <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
            <p><input class="btn" type="submit" value="로그인"></p>
            </form>
            <p>계정이 없으신가요? <a href="/auth/register">회원가입</a></p>
        `, '');
    response.send(html);
});

// 로그인 처리
router.post('/login_process', async (req, res) => {
    try {
        const username = req.body.username || ''; // username이 undefined일 경우 빈 문자열로 설정
        const password = req.body.password || ''; // password도 동일하게 처리

        console.log('로그인 시도:', { username, password }); // 요청 데이터 로그

        if (!username || !password) {
            return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요.' });
        }

        const user = await db.getUserByUsernameAndPassword(username, password);
        
        if (user) {
            req.session.is_logined = true;
            req.session.nickname = user.nickname;
            console.log('로그인 성공:', user.nickname);
            res.redirect('/public');
        } else {
            console.log('로그인 실패: 사용자 정보를 찾을 수 없음');
            res.redirect('/auth/login');
        }
    } catch (error) {
        console.error('로그인 처리 중 오류 발생:', error);
        res.status(500).send('서버 오류');
    }
});

router.get('/logout', (request, response) => {
    request.session.destroy(err => {
        if (err) {
            console.error('로그아웃 중 오류:', err);
        }
        console.log('로그아웃 완료');
        response.redirect('/auth/login'); // 로그인 페이지로 리디렉션
    });
});

router.get('/register', (request, response) => {
    const title = '회원가입';
    const html = template.HTML(title, `
    <h2>회원가입</h2>
    <form action="/auth/register_process" method="post">
    <p><input class="login" type="text" name="username" placeholder="아이디"></p>
    <p><input class="login" type="password" name="pwd" placeholder="비밀번호"></p>
    <p><input class="login" type="password" name="pwd2" placeholder="비밀번호 재확인"></p>
    <p><input class="btn" type="submit" value="제출"></p>
    </form>
    <p><a href="/auth/login">로그인화면으로 돌아가기</a></p>
    `, '');
    response.send(html);
});

router.post('/register_process', (request, response) => {
    const username = request.body.username;
    const password = request.body.pwd;
    const password2 = request.body.pwd2;

    console.log('회원가입 시도:', { username });

    if (username && password && password2) {
        db.query('SELECT * FROM userTable WHERE username = ?', [username], (error, results) => {
            if (error) {
                console.error('DB 조회 중 오류:', error);
                throw error;
            }
            if (results.length <= 0 && password == password2) {
                db.query('INSERT INTO userTable (username, password) VALUES(?,?)', [username, password], (error) => {
                    if (error) {
                        console.error('DB 삽입 중 오류:', error);
                        throw error;
                    }
                    console.log('회원가입 성공:', { username });
                    response.send(`<script type="text/javascript">alert("회원가입이 완료되었습니다!");
                    document.location.href="/";</script>`);
                });
            } else if (password != password2) {
                console.log('회원가입 실패: 비밀번호 불일치');
                response.send(`<script type="text/javascript">alert("입력된 비밀번호가 서로 다릅니다."); 
                document.location.href="/auth/register";</script>`);
            } else {
                console.log('회원가입 실패: 이미 존재하는 아이디');
                response.send(`<script type="text/javascript">alert("이미 존재하는 아이디 입니다."); 
                document.location.href="/auth/register";</script>`);
            }
        });
    } else {
        console.log('회원가입 실패: 입력되지 않은 정보');
        response.send(`<script type="text/javascript">alert("입력되지 않은 정보가 있습니다."); 
        document.location.href="/auth/register";</script>`);
    }
});

module.exports = router;
