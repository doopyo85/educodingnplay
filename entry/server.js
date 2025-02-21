const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 8080;

// 세션 설정
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none'
    }
}));

// CSP 헤더 설정
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; font-src 'self' data: https: *; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
    next();
});

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 정적 파일 제공 - public 디렉토리 설정
app.use(express.static(path.join(__dirname, '../public')));

// 메인 라우트
app.get('/', (req, res) => {
    res.redirect('/project');
});

// project 라우트
app.get('/project', (req, res) => {
    res.render('entry_project', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null
    });
});

app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
});
