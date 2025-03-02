// routes/entryRouter.js
const express = require('express');
const router = express.Router();

// Entry 메인 페이지 라우트
router.get('/', (req, res) => {
    try {
        console.log('Entry Router: 요청 받음');
        console.log('쿼리 파라미터:', req.query);
        
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        
        // 8080 포트로 리다이렉트 - 프로젝트 파일 파라미터 전달
        if (projectFile) {
            // URL 인코딩하여 리다이렉트
            res.redirect(`http://localhost:8080/?project_file=${encodeURIComponent(projectFile)}`);
        } else {
            res.redirect('http://localhost:8080');
        }
        
        // 로그 기록
        console.log(`사용자 ${req.session?.userID || '익명'} Entry 워크스페이스 접근, 프로젝트: ${projectFile}`);
    } catch (error) {
        console.error('Entry 워크스페이스 리다이렉트 오류:', error);
        res.status(500).send('Entry 워크스페이스로 리다이렉트하는 중 오류가 발생했습니다.');
    }
});

// 프로젝트 파일 리다이렉트 라우트 (필요시 사용)
router.get('/project/:filename', (req, res) => {
    const filename = req.params.filename;
    // S3 URL 또는 다른 저장소에서 프로젝트 파일 경로 생성
    const projectUrl = `https://educodingnplaycontents.s3.amazonaws.com/entry/${filename}`;
    res.redirect(`http://localhost:8080/?project_file=${encodeURIComponent(projectUrl)}`);
});

module.exports = router;