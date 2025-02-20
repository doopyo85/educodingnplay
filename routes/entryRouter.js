const express = require('express');
const router = express.Router();
const { s3Client } = require('../config');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

// 엔트리 프로젝트 목록 페이지 렌더링
router.get('/project', (req, res) => {
    console.log('User session:', req.session);
    res.render('entry_project', {
        userID: req.session.userID || null,
        is_logined: req.session.is_logined || false,
        role: req.session.role || 'student',
        centerID: req.session.centerID || null
    });
});

// S3에서 엔트리 프로젝트 목록 가져오기
router.get('/api/get-ent-data', async (req, res) => {
    try {
        const params = { Bucket: process.env.BUCKET_NAME, Prefix: 'ent/' };
        const command = new ListObjectsV2Command(params);
        const data = await s3Client.send(command);

        const files = data.Contents?.map(file => ({
            name: file.Key.split('/').pop(),
            url: `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`
        })) || [];

        res.json(files);
    } catch (error) {
        console.error('S3 데이터 불러오기 오류:', error);
        res.status(500).json({ error: '엔트리 프로젝트 데이터를 불러오는 중 오류 발생' });
    }
});

// 엔트리 프로젝트 실행 페이지
router.get('/view', (req, res) => {
    const projectFile = req.query.project_file;
    if (!projectFile) {
        return res.status(400).send('잘못된 요청: project_file이 필요합니다.');
    }
    res.render('entry_view', { projectFile });
});

// Entry 서비스 리다이렉트
router.get('/', (req, res) => {
    res.redirect(`${process.env.BASE_URL}:8080`);
});

module.exports = router;
