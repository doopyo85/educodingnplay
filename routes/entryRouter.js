// routes/entryRouter.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const url = require('url');

// 인증 미들웨어 가져오기
// 참고: server.js에서 정의된 authenticateUser 함수를 사용합니다.
// 필요에 따라 경로를 조정하세요.
const { authenticateUser } = require('../lib_login/authMiddleware') || 
                             ((req, res, next) => { 
                                 if (req.session && req.session.is_logined) {
                                     next();
                                 } else {
                                     res.redirect('/auth/login');
                                 }
                             });

// Entry 메인 페이지 라우트
router.get('/', authenticateUser, (req, res) => {
    try {
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        
        // URL에서 프로젝트 이름 추출
        let projectName = '';
        if (projectFile) {
            const urlParts = url.parse(projectFile);
            const pathParts = urlParts.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            projectName = fileName.replace('.ent', '');
        }
        
        // Entry 워크스페이스 렌더링
        res.render('entry', {
            userID: req.session.userID,
            role: req.session.role,
            centerID: req.session.centerID,
            projectFile: projectFile,
            projectName: projectName
        });
        
        // 접근 로그 기록 (선택 사항)
        console.log(`User ${req.session.userID} accessed Entry workspace with project: ${projectFile}`);
    } catch (error) {
        console.error('Error rendering Entry workspace:', error);
        res.status(500).send('Entry 워크스페이스를 로드하는 중 오류가 발생했습니다.');
    }
});

// Entry 관련 API 라우트 - 프로젝트 정보 가져오기
router.get('/project-info/:filename', authenticateUser, (req, res) => {
    try {
        const filename = req.params.filename;
        
        // 파일명에서 확장자 제거하여 프로젝트 이름 추출
        const projectName = filename.replace('.ent', '');
        
        // S3 URL 또는 다른 저장소에서 프로젝트 파일 경로 생성
        // 참고: 실제 구현에서는 환경 변수나 설정 파일에서 base URL을 가져오는 것이 좋습니다.
        const s3BaseUrl = process.env.S3_URL || 'https://educodingnplaycontents.s3.amazonaws.com';
        const projectUrl = `${s3BaseUrl}/entry/${filename}`;
        
        res.json({
            name: projectName,
            url: projectUrl
        });
    } catch (error) {
        console.error('Error getting project info:', error);
        res.status(500).json({ error: '프로젝트 정보를 가져오는 중 오류가 발생했습니다.' });
    }
});

// 학습 활동 로그 기록 API
router.post('/log-activity', authenticateUser, (req, res) => {
    try {
        const { action, projectId, details } = req.body;
        const userID = req.session.userID;
        const centerID = req.session.centerID;
        const timestamp = new Date().toISOString();
        
        // 여기에 학습 활동 로그를 데이터베이스에 저장하는 코드 추가
        // 예: db.queryDatabase('INSERT INTO LearningLogs (userID, action, projectId, details, timestamp) VALUES (?, ?, ?, ?, ?)',
        //                     [userID, action, projectId, JSON.stringify(details), timestamp]);
        
        console.log('Learning activity logged:', { userID, action, projectId, timestamp });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error logging activity:', error);
        res.status(500).json({ error: '활동 로그를 기록하는 중 오류가 발생했습니다.' });
    }
});

module.exports = router;