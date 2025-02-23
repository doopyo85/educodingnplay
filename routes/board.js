const express = require('express');
const router = express.Router();
const db = require('../lib_login/db'); // MySQL 연결 가져오기

// 날짜 변환 함수 추가
function formatDate(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// 게시글 목록 가져오기
router.get('/', async (req, res) => {
    console.log('1. 게시글 목록 요청 시작');
    const query = 'SELECT * FROM posts ORDER BY created_at DESC';

    try {
        console.log('2. DB 쿼리 실행 중');
        const results = await db.queryDatabase(query);
        
        // 날짜 변환 적용
        const formattedResults = results.map(post => ({
            ...post,
            created_at: formatDate(post.created_at)
        }));

        console.log('3. DB 쿼리 성공:', formattedResults);
        res.render('board', { posts: formattedResults, user: req.user }); // 현재 로그인한 사용자 정보 추가
        console.log('4. 페이지 렌더링 성공');
    } catch (err) {
        console.error('DB 에러 발생:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 글쓰기 페이지 렌더링
router.get('/write', (req, res) => {
    res.render('write');
});

// 글 작성 처리
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

// 글 수정 페이지 렌더링
router.get('/edit/:id', async (req, res) => {
    const postId = req.params.id;
    const query = 'SELECT * FROM posts WHERE id = ?';

    try {
        const results = await db.queryDatabase(query, [postId]);
        if (results.length === 0) return res.status(404).send('글을 찾을 수 없습니다.');

        res.render('board_edit', { post: results[0] }); // ✅ 파일명 변경
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});


// 글 수정 처리
router.post('/edit/:id', async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const query = 'UPDATE posts SET title = ?, content = ? WHERE id = ?';

    try {
        await db.queryDatabase(query, [title, content, postId]);
        res.redirect('/board');
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 글 삭제 처리
router.get('/delete/:id', async (req, res) => {
    const postId = req.params.id;
    const query = 'DELETE FROM posts WHERE id = ?';

    try {
        await db.queryDatabase(query, [postId]);
        res.redirect('/board');
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 관리자 댓글 추가
router.post('/comment', async (req, res) => {
    const { postId, comment } = req.body;
    const adminName = req.user.username; // 현재 로그인한 관리자 이름
    const query = 'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)';

    try {
        await db.queryDatabase(query, [postId, adminName, comment]);
        res.redirect('/board');
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

module.exports = router;
