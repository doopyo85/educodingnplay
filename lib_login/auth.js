const express = require('express');
const router = express.Router();
const template = require('./template.js');
const bcrypt = require('bcrypt');
const db = require('./db');
const axios = require('axios');
const { queryDatabase } = require('./db');

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

// 로그인 프로세스
router.post('/login_process', async (req, res) => {
    const { userID, password } = req.body;
    try {
      // 데이터베이스에서 사용자 확인 및 비밀번호 검증
      // 성공 시 세션 생성
      req.session.is_logined = true;
      req.session.userID = userID;
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: '세션 저장 중 오류가 발생했습니다.' });
        }
        res.json({ success: true, redirect: '/' });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: '로그인에 실패했습니다.' });
    }
});

// 회원가입 페이지 렌더링
router.get('/register', async (req, res) => {
    const title = '회원가입';
    
    try {
        let centerOptions = '<option value="">센터를 선택하세요</option>';
        
        try {
            const response = await axios.get('https://codingnplay.site/center/api/get-center-list', {
                headers: {
                    'Authorization': `Bearer ${process.env.API_ACCESS_TOKEN}`
                }
            });
            const centers = response.data.centers;
            centerOptions += centers.map(center => `<option value="${center.id}">${center.name}</option>`).join('');
        } catch (apiError) {
            console.error('API call error:', apiError);
        }

        const html = template.HTML(title, `
            <h2 style="text-align: center; font-size: 18px; margin-bottom: 20px;">회원정보를 입력하세요</h2>
            <form id="registerForm">
                <input class="login" type="text" name="userID" placeholder="아이디" required>
                <input class="login" type="password" name="password" placeholder="비밀번호" required>
                <input class="login" type="email" name="email" placeholder="이메일" required>
                <input class="login" type="text" name="name" placeholder="이름" required>
                <input class="login" type="tel" name="phone" placeholder="전화번호">
                <input class="login" type="date" name="birthdate" placeholder="생년월일">
                <select class="login" name="role">
                    <option value="student">학생</option>
                    <option value="teacher">선생님</option>
                    <option value="manager">원장님</option>
                </select>
                <select class="login" name="centerID" required>
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

            <div id="privacyPolicyModal" class="modal" style="display:none;">
                <div class="modal-content">
                    <span id="closeModal" style="cursor:pointer;">&times;</span>
                    <h3>개인정보 처리방침</h3>
                    <p>여기에 개인정보 처리방침의 내용을 작성하세요...</p>
                </div>
            </div>

            <p class="login-link" style="text-align: center; margin-top: 20px; font-size: 14px;">
                이미 계정이 있으신가요? <a href="/auth/login" style="color: #333; text-decoration: none; font-weight: bold;">로그인</a>
            </p>

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
                        headers: {
                            'Content-Type': 'application/json',
                        },
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

                document.getElementById('privacyPolicyLink').addEventListener('click', function(event) {
                    event.preventDefault();
                    document.getElementById('privacyPolicyModal').style.display = 'block';
                });

                document.getElementById('closeModal').addEventListener('click', function() {
                    document.getElementById('privacyPolicyModal').style.display = 'none';
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
        
        console.log('Received registration data:', req.body); // 로깅 추가

        // 역할 매핑
        let mappedRole;
        switch(role) {
            case 'student':
                mappedRole = 'student';
                break;
            case 'teacher':
                mappedRole = 'teacher';
                break;
            case 'center':
                mappedRole = 'center';
                break;
            default:
                throw new Error('Invalid role');
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 데이터베이스에 사용자 정보 저장
        const query = `
            INSERT INTO Users (userID, password, email, name, phone, birthdate, role, centerID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [userID, hashedPassword, email, name, phone, birthdate, role, centerID];

        await queryDatabase(query, values);

        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }
});

module.exports = router;