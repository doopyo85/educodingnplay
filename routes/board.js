const express = require('express');
const router = express.Router();

// 게시판 메인 페이지
router.get('/', (req, res) => {
    res.render('board', { title: '게시판' });
});

// 검색 처리
router.get('/search', (req, res) => {
    const { searchType, searchValue } = req.query;
    // 검색 처리 로직
    res.render('board', { title: '검색 결과' });
});

// 글쓰기 페이지
router.get('/write', (req, res) => {
    res.render('write', { title: '글쓰기' });
});

router.get('/check-new-posts', (req, res) => {
    // 데이터베이스에서 새 글 확인 로직 구현 (여기서는 예시로 처리)
    const hasNewPosts = true; // 실제 데이터베이스에서 새 글 여부를 확인하는 로직 필요
    res.json({ newPosts: hasNewPosts });
});

module.exports = router;
