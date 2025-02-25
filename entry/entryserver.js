const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// CORS 설정
app.use((req, res, next) => {
    // 모든 도메인 허용 (개발 환경)
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// 디버깅 로그
app.use((req, res, next) => {
    console.log('Request:', req.method, req.path, req.query);
    next();
});

// 메인 페이지 - 엔트리 에디터
app.get('/', (req, res) => {
    try {
        const projectFile = req.query.project_file || '';
        console.log('Rendering entry_workspace with project file:', projectFile);
        
        res.render('entry_workspace', { 
            projectFile,
            baseUrl: req.protocol + '://' + req.get('host')
        });
    } catch (error) {
        console.error('Error rendering entry_workspace:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 오류 처리
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
});