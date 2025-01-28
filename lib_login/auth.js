const express = require('express');
const router = express.Router();
const template = require('./template.js');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
const { queryDatabase } = require('./db');
const { BASE_URL, API_ENDPOINTS, Roles } = require('../config');

// 구글 시트 데이터 가져오기
async function fetchCentersFromSheet() {
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: '센터정보!A2:B' // A: ID, B: Name
    });
    return response.data.values; // [[id1, name1], [id2, name2], ...]
}

// 로그인 페이지 렌더링
router.get('/login', (req, res) => {
    const title = '로그인';
    const body = `
      <div style="text-align: center;">
        <img src="/resource/coding&academy_logo150x500.png" alt="로고" style="width: 150px; height: auto; margin-bottom: 10px;"/>
      </div>
      <form id="loginForm">
        <input class="login" type="text" name="userID" placeholder="아이디" required>
        <input class="login" type="password" name="pwd" placeholder="비밀번호" required>
        <input class="btn" type="submit" value="로그인">
      </form>
      <p class="register-link">
        계정이 없으신가요? <a href="/auth/register">회원가입</a>
      </p>
    `;
    const html = template.HTML(title, body);
    res.send(html);
});

// 로그인 처리
router.post('/login_process', async (req, res) => {
    const { userID, password } = req.body;
    try {
        const query = 'SELECT * FROM Users WHERE userID = ?';
        const [user] = await queryDatabase(query, [userID]);

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.is_logined = true;
            req.session.userID = userID;
            req.session.role = user.role;
            req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: '세션 저장 중 오류가 발생했습니다.' });
                }
                res.json({ success: true, redirect: '/' });
            });
        } else {
            res.status(401).json({ error: '로그인 정보가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 회원가입 페이지 렌더링
router.get('/register', async (req, res) => {
    const title = '회원가입';
    
    try {
        const centers = await fetchCentersFromSheet();
        const centerOptions = centers
            .map(([id, name]) => `<option value="${id}">${name}</option>`)
            .join('');

        const html = template.HTML(title, `
            <h2 style="text-align: center; font-size: 18px; margin-bottom: 20px;">회원정보를 입력하세요</h2>
            <form id="registerForm">
                <input class="login" type="text" name="userID" placeholder="아이디" required>
                <input class="login" type="password" name="password" placeholder="비밀번호" required>
                <input class="login" type="email" name="email" placeholder="이메일" required>
                <input class="login" type="text" name="name" placeholder="이름" required>
                <input class="login" type="tel" name="phone" placeholder="전화번호">
                <input class="login" type="date" name="birthdate" placeholder="생년월일">

                <select class="login" name="role" required>
                    <option value="student">학생</option>
                    <option value="teacher">강사</option>
                    <option value="manager">센터장</option>
                    <option value="kinder">유치원</option>
                    <option value="school">학교(기관)</option>
                </select>

                <select class="login" name="centerID" required>
                    <option value="">센터를 선택하세요</option>
                    ${centerOptions}
                </select>
                
                <div style="margin: 10px 0;">
                    <input type="checkbox" id="privacyAgreement" required>
                    <label for="privacyAgreement" style="font-size: 12px;">
                        개인정보 취급방침에 동의합니다. <a href="#" id="privacyPolicyLink">자세히 보기</a>
                    </label>
                </div>

                <input class="btn" type="submit" value="가입하기" style="width: 100%; padding: 10px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer;">
            </form>

            <script>
                document.getElementById('registerForm').addEventListener('submit', function(event) {
                    event.preventDefault();
                    
                    if (!document.getElementById('privacyAgreement').checked) {
                        alert('개인정보 취급방침에 동의해야 합니다.');
                        return;
                    }

                    const formData = new FormData(this);
                    const data = Object.fromEntries(formData.entries());

                    fetch('/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            alert(data.error);
                        } else {
                            alert(data.message);
                            window.location.href = '/auth/login';
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                        alert('회원가입 중 오류가 발생했습니다.');
                    });
                });
            </script>
        `);
        res.send(html);
    } catch (error) {
        console.error('Error rendering register page:', error);
        res.status(500).send('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
});

// 회원가입 처리
router.post('/register', async (req, res) => {
    try {
        const { userID, password, email, name, phone, birthdate, role, centerID } = req.body;

        const allowedRoles = Object.values(Roles);
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO Users (userID, password, email, name, phone, birthdate, role, centerID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [userID, hashedPassword, email, name, phone, birthdate, role, centerID];

        await queryDatabase(query, values);

        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }
});

module.exports = router;