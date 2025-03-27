const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const template = require('./template.js');
const { google } = require('googleapis');
const { queryDatabase } = require('./db');
const { BASE_URL, API_ENDPOINTS, Roles } = require('../config');

// 구글 시트 데이터 가져오기
async function fetchCentersFromSheet() {
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: '센터목록!A2:B' // A: ID, B: Name
    });
    return response.data.values; // [[id1, name1], [id2, name2], ...]
}

// 로그인 페이지 렌더링 - EJS 템플릿 방식으로 변경
router.get('/login', (req, res) => {
    if (req.session && req.session.is_logined) {
        // 이미 로그인 한 경우 메인 페이지로 리다이렉트
        return res.redirect('/');
    }
    
    res.render('auth/login', {
        title: '로그인',
        userRole: req.session?.role || 'guest',
        is_logined: req.session?.is_logined || false,
        userID: req.session?.userID || null,
        centerID: req.session?.centerID || null,
        errorMessage: req.query.error
    });
});

// 로그인 처리
router.post('/login_process', async (req, res) => {
    const { userID, password } = req.body;

    try {
        // 사용자 조회
        const query = 'SELECT * FROM Users WHERE userID = ?';
        const users = await queryDatabase(query, [userID]);

        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, error: '아이디가 존재하지 않습니다.' });
        }

        const user = users[0]; // 첫 번째 결과를 user 객체로 사용

        // 비밀번호 검증
        if (!password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, error: '비밀번호가 올바르지 않습니다.' });
        }

        // 세션 설정
        req.session.is_logined = true;
        req.session.userID = user.userID;
        req.session.role = user.role;
        if (user.centerID) req.session.centerID = user.centerID;

        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, error: '세션 저장 중 오류가 발생했습니다.' });
            }

            // 역할별 리다이렉트 URL 설정
            let redirectUrl = '/';
            if (user.role === 'kinder') {
                redirectUrl = '/kinder';
            } else if (user.role === 'admin') {
                redirectUrl = '/admin';
            }

            res.json({ success: true, redirect: redirectUrl });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: '로그인 처리 중 오류가 발생했습니다.' });
    }
});

// 회원가입 페이지 렌더링 - 기존 방식 유지 (나중에 EJS로 변경 가능)
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

            <!-- 개인정보 처리방침 모달 추가 -->
            <div id="privacyModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4); z-index: 1000;">
                <div class="modal-content" style="background-color: white; margin: 15% auto; padding: 20px; width: 70%; max-width: 600px; border-radius: 5px; position: relative;">
                    <span class="close" style="position: absolute; right: 10px; top: 5px; font-size: 24px; cursor: pointer;">&times;</span>
                    <h2>개인정보 처리방침</h2>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <h3>1. 개인정보 수집 항목 및 목적</h3>
                        <p>필수항목: 이름, 아이디, 비밀번호, 이메일, 생년월일, 연락처<br>
                        선택항목: 소속 교육기관<br>
                        수집목적: 회원가입, 서비스 제공, 교육 진도 관리, 학습 분석</p>

                        <h3>2. 개인정보 보유 기간</h3>
                        <p>- 회원 탈퇴 시까지 보관<br>
                        - 법령에 따른 보관의무가 있는 경우 해당 기간 동안 보관</p>

                        <h3>3. 개인정보의 제3자 제공</h3>
                        <p>- 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.<br>
                        - 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차를 따르는 경우 예외</p>

                        <h3>4. 이용자의 권리</h3>
                        <p>- 개인정보 열람 요구<br>
                        - 오류 정정 요구<br>
                        - 삭제 요구<br>
                        - 처리정지 요구</p>

                        <h3>5. 개인정보 안전성 확보 조치</h3>
                        <p>- 개인정보 암호화<br>
                        - 해킹 등에 대비한 보안시스템 구축<br>
                        - 개인정보 취급자 최소화</p>

                        <h3>6. 개인정보 담당자</h3>
                        <p>- 담당부서: 교육사업부<br>
                        - 담당자명: 전두표<br>
                        - 연락처: 070-4337-4337<br>
                        - 이메일: codmoedu@cosmoedu.co.kr</p>
                        
                        <h3>7. 시행일자</h3>
                        <p>2024년 9월 1일</p>
                    </div>
                </div>
            </div>
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
            
                // 개인정보 처리방침 모달 관련 스크립트 추가
                const modal = document.getElementById('privacyModal');
                const privacyLink = document.getElementById('privacyPolicyLink');
                const closeBtn = document.getElementsByClassName('close')[0];

                privacyLink.onclick = function(e) {
                    e.preventDefault();
                    modal.style.display = 'block';
                }

                closeBtn.onclick = function() {
                    modal.style.display = 'none';
                }

                window.onclick = function(event) {
                    if (event.target == modal) {
                        modal.style.display = 'none';
                    }
                }
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