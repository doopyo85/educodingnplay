const express = require('express');
const router = express.Router();
const template = require('./template.js');
const bcrypt = require('bcrypt');
const db = require('./db');
const axios = require('axios');
const { queryDatabase } = require('./db');


// 로그인 페이지 라우트
router.get('/login', (request, response) => {
    const title = '로그인';
    const html = template.HTML(title, `
        <h2>로그인</h2>
        <form id="loginForm">
            <p><input class="login" type="text" name="userID" placeholder="아이디"></p>
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
                        const response = xhr.responseJSON;
                        if (response && response.error) {
                            alert(response.error);
                        } else {
                            alert("로그인 중 오류가 발생했습니다.");
                        }
                    }
                });
            });
        });
        </script>
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
            console.log('Comparing passwords');
            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Password match:', isMatch);

            if (isMatch) {
                // 로그인 성공
                req.session.is_logined = true;
                req.session.userID = user.userID;
                console.log('Login successful, session:', req.session);
                res.json({ success: true, redirect: '/' });
            } else {
                console.log('Password mismatch');
                res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
            }
        } else {
            console.log('User not found or password info missing');
            res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (err) {
        console.error('Login process error:', err);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.' });
    }
    console.log('로그인 처리 종료');
});

// 회원가입 페이지 라우트
router.get('/register', async (req, res) => {
    const title = '회원가입';
    
    try {
        // 내부 API를 통해 센터 목록 가져오기
        const response = await axios.get('https://codingnplay.site/center/api/get-center-list', {
            httpsAgent: new (require('https').Agent)({  
                rejectUnauthorized: false
            })
        });
        const centers = response.data.centers;
        
        // 센터 목록 옵션 생성
        const centerOptions = centers.map(center => `<option value="${center.id}">${center.name}</option>`).join('');

        const html = template.HTML(title, `
            <h2>회원가입</h2>
            <form id="registerForm">
                <p><input class="login" type="text" name="userID" placeholder="아이디" required></p>
                <p><input class="login" type="password" name="password" placeholder="비밀번호" required></p>
                <p><input class="login" type="email" name="email" placeholder="이메일" required></p>
                <p><input class="login" type="text" name="name" placeholder="이름" required></p>
                <p><input class="login" type="tel" name="phone" placeholder="전화번호"></p>
                <p><input class="login" type="date" name="birthdate" placeholder="생년월일"></p>
                <p>
                    <select class="login" name="role">
                        <option value="student">학생</option>
                        <option value="teacher">선생님</option>
                        <option value="principal">원장님</option>
                    </select>
                </p>
                <p>
                    <select class="login" name="centerID" required>
                        <option value="">센터를 선택하세요</option>
                        ${centerOptions}
                    </select>
                </p>
                <p><input class="btn" type="submit" value="가입하기"></p>
            </form>
            <p>이미 계정이 있으신가요? <a href="/auth/login">로그인</a></p>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script>
            $(document).ready(function() {
                $('#registerForm').on('submit', function(e) {
                    e.preventDefault();
                    $.ajax({
                        url: '/auth/register_process',
                        method: 'POST',
                        data: $(this).serialize(),
                        success: function(response) {
                            if (response.success) {
                                alert(response.message);
                                window.location.href = '/auth/login';
                            }
                        },
                        error: function(xhr, status, error) {
                            const response = xhr.responseJSON;
                            if (response && response.error) {
                                alert(response.error);
                            } else {
                                alert("회원가입 중 오류가 발생했습니다.");
                            }
                        }
                    });
                });
            });
            </script>
        `, '');
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