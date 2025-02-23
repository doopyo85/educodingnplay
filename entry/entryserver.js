const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 8080;

// CSP 설정
// CSP 설정
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        [
            // 기본 제한
            "default-src 'self' https: blob: data: entry-cdn.pstatic.net *.playentry.org",
            
            // 스크립트 허용
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: unpkg.com playentry.org entry-cdn.pstatic.net",
            
            // 스타일 허용
            "style-src 'self' 'unsafe-inline' https: playentry.org *.playentry.org",
            
            // 리소스 허용
            "img-src 'self' blob: data: https: *",
            "media-src 'self' blob: data: https: *",
            
            // 웹 워커 및 프레임 허용
            "worker-src 'self' 'unsafe-inline' blob: data: https: *",
            "child-src 'self' blob: data: https: *",
            "frame-src 'self' blob: data: https: *",
            
            // 폰트 허용
            "font-src 'self' blob: data: https: *",
            
            // 웹소켓 및 XHR 허용
            "connect-src 'self' https: wss: ws: *"
        ].join('; ')
    );
    next();
});

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

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

// Entry 프로젝트 목록 페이지
app.get('/entry_project', (req, res) => {
    res.render('entry_project', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null
    });
});

// Entry 에디터 페이지
app.get('/entry', (req, res) => {
    try {
        const projectFile = req.query.project_file;
        res.render('entry_editor', {
            userID: req.session?.userID || null,
            is_logined: req.session?.is_logined || false,
            role: req.session?.role || 'student',
            centerID: req.session?.centerID || null,
            projectFile: projectFile || null,
            baseUrl: 'https://app.codingnplay.co.kr'
        });
    } catch (error) {
        console.error('Entry 라우트 오류:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
});

module.exports = app;