// routes/entryRouter.js 간소화 버전
const express = require('express');
const router = express.Router();

// Entry 메인 페이지 라우트
router.get('/', (req, res) => {
    try {
        console.log('Entry Router: Request received');
        console.log('Query params:', req.query);
        
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        
        // Entry 워크스페이스 렌더링
        res.render('entry', {
            userID: req.session?.userID || '',
            role: req.session?.role || 'guest',
            centerID: req.session?.centerID || '',
            projectFile: projectFile,
            projectName: projectFile ? projectFile.split('/').pop().replace('.ent', '') : ''
        });
        
        console.log(`User ${req.session?.userID || 'anonymous'} accessed Entry workspace`);
    } catch (error) {
        console.error('Error rendering Entry workspace:', error);
        res.status(500).send('Entry 워크스페이스를 로드하는 중 오류가 발생했습니다.');
    }
});

module.exports = router;
