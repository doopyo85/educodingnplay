const express = require('express');
const router = express.Router();
const db = require('../lib_login/db'); // MySQL 연결 가져오기

router.get('/', async (req, res) => {
    try {
      const query = 'SELECT * FROM posts ORDER BY created_at DESC';
      const results = await db.queryDatabase(query);
      res.render('board', { posts: results });
    } catch (err) {
      console.error('DB 에러:', err);
      res.status(500).send('DB 에러 발생');
    }
  });


// 검색 처리
router.get('/search', (req, res) => {
    const { searchType, searchValue } = req.query;
    // 검색 처리 로직
    res.render('board', { title: '검색 결과' });
});

// 글쓰기 페이지 렌더링
router.get('/write', (req, res) => {
    res.render('write');
});
  
router.post('/write', async (req, res) => {
    const { title, content, author } = req.body;
    const query = 'INSERT INTO posts (title, content, author) VALUES (?, ?, ?)';
    try {
        await db.queryDatabase(query, [title, content, author]);
        res.redirect('/board');
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

router.get('/check-new-posts', (req, res) => {
    // 데이터베이스에서 새 글 확인 로직 구현 (여기서는 예시로 처리)
    const hasNewPosts = true; // 실제 데이터베이스에서 새 글 여부를 확인하는 로직 필요
    res.json({ newPosts: hasNewPosts });
});

module.exports = router;
