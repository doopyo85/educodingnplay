// routes/entryRouter.js
const express = require('express');
const router = express.Router();

// Entry 메인 페이지 라우트 - 바로 playentry.org로 리다이렉트
router.get('/', (req, res) => {
    try {
        console.log('Entry Router: 요청 받음');
        console.log('쿼리 파라미터:', req.query);
        
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        
        // 직접 playentry.org로 리다이렉트
        const entryUrl = projectFile 
            ? `https://playentry.org/ws#file:${encodeURIComponent(projectFile)}`
            : 'https://playentry.org/ws';
        
        // 리다이렉트 전에 로그 기록
        console.log(`사용자 ${req.session?.userID || '익명'} Entry 워크스페이스 접근, 프로젝트: ${projectFile}`);
        
        // 새 창으로 열기 위한 HTML 반환
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Entry Studio 리다이렉트</title>
            <script>
                // 페이지 로드 시 바로 새 창으로 열고 이전 페이지로 이동
                window.onload = function() {
                    window.open('${entryUrl}', '_blank');
                    window.history.back();
                };
            </script>
        </head>
        <body>
            <p>Entry Studio로 이동 중...</p>
        </body>
        </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Entry 워크스페이스 리다이렉트 오류:', error);
        res.status(500).send('Entry 워크스페이스로 리다이렉트하는 중 오류가 발생했습니다.');
    }
});

module.exports = router;