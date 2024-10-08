const express = require('express');
const router = express.Router();
const db = require('../lib_login/db'); // MySQL 연결 가져오기

// 게시글 목록 가져오기 라우트
router.get('/', async (req, res) => {
  console.log('1. 게시글 목록 요청 시작'); // 첫 번째 로그 추가
  const query = 'SELECT * FROM posts ORDER BY created_at DESC';

  try {
      console.log('2. DB 쿼리 실행 중'); // 두 번째 로그 추가
      const results = await db.queryDatabase(query);
      console.log('3. DB 쿼리 성공:', results); // 세 번째 로그 추가

      res.render('board', { posts: results });
      console.log('4. 페이지 렌더링 성공'); // 네 번째 로그 추가
  } catch (err) {
      console.error('DB 에러 발생:', err);
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
