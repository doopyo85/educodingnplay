const express = require('express');
const router = express.Router();
const db = require('./db'); // DB 연결 파일
const bcrypt = require('bcrypt');

// 개인정보 제공 동의 화면 라우팅
router.get('/terms', (req, res) => {
    const html = `
        <h1>이용약관과 개인정보 수집 및 이용에 모두 동의합니다.</h1>
        <div>
            <h2>이용약관</h2>
            <textarea readonly>이용약관 내용...</textarea>
            <label><input type="checkbox" id="agreeTerms"> 동의 (필수)</label>
        </div>
        <div>
            <h2>개인정보 수집 및 이용 동의</h2>
            <textarea readonly>개인정보 수집 및 이용 동의 내용...</textarea>
            <label><input type="checkbox" id="agreePrivacy"> 동의 (필수)</label>
        </div>
        <button id="continueSignup" disabled>확인</button>

        <script>
            document.getElementById('agreeTerms').addEventListener('change', checkAgreement);
            document.getElementById('agreePrivacy').addEventListener('change', checkAgreement);
            
            function checkAgreement() {
                const agreeTerms = document.getElementById('agreeTerms').checked;
                const agreePrivacy = document.getElementById('agreePrivacy').checked;
                document.getElementById('continueSignup').disabled = !(agreeTerms && agreePrivacy);
            }

            document.getElementById('continueSignup').addEventListener('click', () => {
                window.location.href = '/auth/register';
            });
        </script>
    `;
    res.send(html);
});

// 회원정보 입력 폼 라우팅
router.get('/register', (req, res) => {
    const html = `
        <h1>회원가입</h1>
        <form action="/auth/register_process" method="post">
            <label for="username">아이디 (필수)</label>
            <input type="text" name="username" required minlength="3" maxlength="30">

            <label for="name">이름 (필수)</label>
            <input type="text" name="name" required>

            <label for="email">본인 확인 이메일 (필수)</label>
            <input type="email" name="email" required>

            <label for="password">비밀번호 (필수)</label>
            <input type="password" name="password" required>
            <small>
                영문 대소문자, 숫자, 특수문자를 포함하여 8자리 이상 입력하세요.
            </small>

            <label for="birthdate">생년월일 (필수)</label>
            <input type="date" name="birthdate" required>

            <label for="role">소속/학교 (필수)</label>
            <select name="role" required>
                <option value="student">학생</option>
                <option value="teacher">강사</option>
                <option value="principal">원장</option>
            </select>

             <button type="submit">가입하기</button>
        </form>
    `;
    res.send(html);
});

// 회원가입 처리 라우팅
router.post('/register_process', async (req, res) => {
    const { username, name, email, password, birthdate, role } = req.body;

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(`
        INSERT INTO Users (username, password, email, name, birthdate, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [username, hashedPassword, email, name, birthdate, role], (err, results) => {
        if (err) {
            console.error('회원가입 중 오류 발생:', err);
            return res.status(500).send('서버 오류');
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;

// template.js
module.exports = {
    HTML: function (title, body, authStatusUI) {
        return `
    <!doctype html>
    <html>
    <head>
      <title>Join Us - ${title}</title>
      <meta charset="utf-8">
      <style>
        /* 여기에 스타일을 추가 */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1, h2 {
            text-align: center;
            color: #333;
        }
        form {
            margin: 0 auto;
            display: flex;
            flex-direction: column;
        }
        input[type="text"], input[type="password"], input[type="email"], input[type="date"] {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            border: 1px solid #ddd;
        }
        button {
            padding: 10px;
            background-color: #5cb85c;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #4cae4c;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${authStatusUI || ''}
        <h1>${title}</h1>
        ${body}
      </div>
    </body>
    </html>
        `;
    }
};
