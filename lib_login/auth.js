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
      <h2>로그인</h2>
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
        const response = await axios.get('https://codingnplay.site/center/api/get-center-list', {
            headers: {
                'Authorization': `Bearer ${your_access_token}`  // 필요한 경우 토큰을 추가
            },        
            
            httpsAgent: new (require('https').Agent)({  
                rejectUnauthorized: false
            })
        });
        const centers = response.data.centers;
        
        const centerOptions = centers.map(center => `<option value="${center.id}">${center.name}</option>`).join('');

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
                    <option value="principal">원장님</option>
                </select>
                <select class="login" name="centerID" required>
                    <option value="">센터를 선택하세요</option>
                    ${centerOptions}
                </select>
                
                <!-- 개인정보 처리방침 동의 체크박스 -->
                <div style="margin: 10px 0;">
                    <input type="checkbox" id="privacyAgreement" required>
                    <label for="privacyAgreement" style="font-size: 12px;">
                        개인정보 취급방침에 동의합니다. <a href="#" id="privacyPolicyLink">자세히 보기</a>
                    </label>
                </div>

                <input class="btn" type="submit" value="가입하기" style="width: 100%; padding: 10px; background-color: black; color: white; border: none; border-radius: 4px; cursor: pointer;">
            </form>

            <!-- 개인정보 처리방침 모달 -->
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
                // 개인정보 취급방침 체크 확인
                document.getElementById('registerForm').addEventListener('submit', function(event) {
                    if (!document.getElementById('privacyAgreement').checked) {
                        alert('개인정보 취급방침에 동의해야 합니다.');
                        event.preventDefault();  // 폼 제출 방지
                    }
                });

                // 개인정보 처리방침 모달 창 열기
                document.getElementById('privacyPolicyLink').addEventListener('click', function(event) {
                    event.preventDefault();
                    document.getElementById('privacyPolicyModal').style.display = 'block';
                });

                // 모달 닫기
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

module.exports = router;
