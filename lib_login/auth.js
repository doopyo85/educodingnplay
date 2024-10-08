const express = require('express');
const router = express.Router();
const template = require('./template.js');
const bcrypt = require('bcrypt');
const db = require('./db');
const axios = require('axios');
const { queryDatabase } = require('./db');

// auth.js
router.get('/login', (request, response) => {
    const title = '로그인';
    const html = template.HTML(title, `
        <div style="text-align: center;">
            <img src="/public/resource/logo.png" alt="코딩앤플레이 로고" class="logo" style="display: inline-block;">
            <h2 style="text-align: center;">계정에 로그인 하세요</h2>
        </div>
        <form id="loginForm" class="login-form">
            <input class="login" type="text" name="userID" placeholder="아이디" required>
            <input class="login" type="password" name="pwd" placeholder="비밀번호" required>
            <div class="login-options">
                <div class="checkbox-container">
                    <input type="checkbox" id="rememberMe">
                    <label for="rememberMe">로그인 저장</label>
                </div>
                <a href="/auth/forgot_password" class="forgot-password">비밀번호 찾기</a>
            </div>
            <input class="btn" type="submit" value="로그인">
        </form>
        <p class="register-link">아직 계정이 없으신가요? <a href="/auth/register">가입하기</a></p>
    `, '');
    response.send(html);
});



// 사용자 ID로 사용자 정보 가져오는 함수
async function getUserByUserID(userID) {
    try {
      const query = 'SELECT * FROM Users WHERE userID = ?';
      const results = await queryDatabase(query, [userID]);
      console.log('Database query results:', results); // 디버깅을 위한 로그
      if (results.length > 0) {
        return results[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

// 로그인 처리 로직
router.post('/login_process', async (req, res) => {
    console.log('로그인 처리 시작');
    const { userID, password } = req.body;
    console.log('Login attempt:', { userID, passwordLength: password ? password.length : 0 });

    try {
        const user = await getUserByUserID(userID);
        console.log('User found:', user ? 'Yes' : 'No');

        if (user && user.password && password) {
            console.log('Stored password (hashed):', user.password);
            console.log('Password entered:', password);
            
            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Password match result:', isMatch);
            
            if (isMatch) {
                // 로그인 성공 처리
                req.session.is_logined = true;
                req.session.userID = user.userID;

                // 세션 저장 후 응답 전송
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.status(500).json({ error: '세션 저장 중 오류가 발생했습니다.' });
                    }
                    console.log('Login successful, sending response to client');
                    res.json({ success: true, redirect: '/' });
                });
            } else {
                console.log('Incorrect password');
                res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
        } else {
            console.log('User not found or password info missing');
            
        }
    } catch (err) {
        console.error('Login process error:', err);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.' });
    }
    console.log('로그인 처리 종료');
});

// 회원가입 페이지 라우트
// auth.js - 회원가입 부분
router.get('/register', async (req, res) => {
    const title = '회원가입';
    
    try {
        const response = await axios.get('https://codingnplay.site/center/api/get-center-list', {
            httpsAgent: new (require('https').Agent)({  
                rejectUnauthorized: false
            })
        });
        const centers = response.data.centers;
        
        const centerOptions = centers.map(center => `<option value="${center.id}">${center.name}</option>`).join('');

        const html = template.HTML(title, `
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
                <input class="btn" type="submit" value="가입하기">
            </form>
            <p class="register-link">이미 계정이 있으신가요? <a href="/auth/login">로그인</a></p>
        `);
        res.send(html);
    } catch (error) {
        console.error('Error rendering register page:', error);
        res.status(500).send('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
});

// 회원가입 처리 라우트
router.post('/register_process', async (req, res) => {
    try {
        const { userID, password, email, name, phone, birthdate, role, centerID } = req.body;
        console.log('Registration attempt:', { userID, email, name, role, centerID });

        if (!userID || !password || !email || !name || !centerID) {
            return res.status(400).json({ error: '필수 필드를 모두 입력해주세요.' });
        }

        const existingUser = await getUserByUserID(userID);
        if (existingUser) {
            return res.status(400).json({ error: '이미 존재하는 ID입니다. 다른 ID를 입력하세요.' });
        }

        await createUser(userID, password, email, name, phone, birthdate, role, centerID);

        res.json({ 
            success: true, 
            message: '회원가입이 완료되었습니다. 가입한 ID로 로그인 하세요.' 
        });
    } catch (error) {
        console.error('회원가입 처리 중 오류 발생:', error);
        res.status(500).json({ error: '서버 오류', details: error.message });
    }
});

// 사용자 생성 함수
async function createUser(userID, password, email, name, phone, birthdate, role, centerID) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO Users (userID, password, email, name, phone, birthdate, role, centerID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [userID, hashedPassword, email, name, phone, birthdate, role, centerID];
    
    try {
        const results = await queryDatabase(query, values);
        return results;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

module.exports = router;