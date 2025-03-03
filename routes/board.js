const express = require('express');
const router = express.Router();
const db = require('../lib_login/db'); // MySQL 연결 가져오기

// 날짜 변환 함수
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
    console.log('📢 게시글 목록 요청 시작');
    console.log('👤 세션 정보:', req.session);
    
    const query = 'SELECT * FROM posts ORDER BY created_at DESC';

    try {
        const results = await db.queryDatabase(query);

        // 날짜 변환 적용
        const formattedResults = results.map(post => ({
            ...post,
            created_at: formatDate(post.created_at)
        }));

        console.log('✅ 게시글 불러오기 성공');
        
        // 사용자 정보를 템플릿에 전달
        const user = req.session.is_logined ? {
            username: req.session.userID,
            role: req.session.role
        } : null;
        
        res.render('board', { 
            posts: formattedResults, 
            user: user,
            userID: req.session.userID,
            is_logined: req.session.is_logined
        });
    } catch (err) {
        console.error('❌ DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 새 글 등록 (하단 입력창에서 전송)
router.post('/write', async (req, res) => {
    console.log("🔍 현재 세션 정보:", req.session);  // 세션 데이터 확인용

    // 세션 체크 수정: req.session.user 대신 req.session.is_logined 사용
    if (!req.session.is_logined) {
        return res.status(403).json({ error: '로그인이 필요합니다.' });
    }

    const { title } = req.body;
    const author = req.session.userID; // session.user.username 대신 session.userID 사용

    try {
        await db.queryDatabase('INSERT INTO posts (title, author) VALUES (?, ?)', [title, author]);
        res.json({ success: true });
    } catch (err) {
        console.error('DB 에러:', err);
        res.status(500).json({ error: 'DB 에러 발생' });
    }
});

// 글 수정 페이지 렌더링
router.get('/edit/:id', async (req, res) => {
    const postId = req.params.id;
    const query = 'SELECT * FROM posts WHERE id = ?';

    try {
        const results = await db.queryDatabase(query, [postId]);
        if (results.length === 0) return res.status(404).send('글을 찾을 수 없습니다.');

        res.render('board_edit', { post: results[0] });
    } catch (err) {
        console.error('❌ DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 글 수정 처리
router.post('/edit/:id', async (req, res) => {
    const postId = req.params.id;
    const { title } = req.body;
    const query = 'UPDATE posts SET title = ? WHERE id = ?';

    try {
        await db.queryDatabase(query, [title, postId]);
        res.redirect('/board');
    } catch (err) {
        console.error('❌ DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

// 글 삭제 처리 (권한 체크 및 DELETE 메서드 지원 추가)
router.delete('/delete/:id', deletePost);
router.get('/delete/:id', deletePost);

// 게시글 삭제 핸들러 함수
async function deletePost(req, res) {
    // 로그인 체크 (세션 구조에 맞게 수정)
    if (!req.session.is_logined) {
        return res.status(403).send('로그인이 필요합니다.');
    }

    const postId = req.params.id;
    const query = 'SELECT * FROM posts WHERE id = ?';

    try {
        const results = await db.queryDatabase(query, [postId]);
        if (results.length === 0) {
            return res.status(404).send('글을 찾을 수 없습니다.');
        }

        const post = results[0];
        // 세션 구조에 맞게 권한 체크 수정
        const isAuthor = req.session.userID === post.author;
        const isAdmin = req.session.role === 'admin';

        if (!isAuthor && !isAdmin) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }

        await db.queryDatabase('DELETE FROM posts WHERE id = ?', [postId]);
        
        // AJAX 요청과 일반 요청 구분
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.json({ success: true });
        } else {
            res.redirect('/board');
        }
    } catch (err) {
        console.error('❌ DB 에러:', err);
        
        // AJAX 요청과 일반 요청 구분
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            res.status(500).json({ error: 'DB 에러 발생' });
        } else {
            res.status(500).send('DB 에러 발생');
        }
    }
}

// 관리자 댓글 추가
router.post('/comment', async (req, res) => {
    // 세션 구조에 맞게 수정
    if (!req.session.is_logined) {
        return res.status(403).send('로그인이 필요합니다.');
    }
    
    const { postId, comment } = req.body;
    const adminName = req.session.userID; // 현재 로그인한 관리자 이름
    const query = 'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)';

    try {
        await db.queryDatabase(query, [postId, adminName, comment]);
        res.redirect('/board');
    } catch (err) {
        console.error('❌ DB 에러:', err);
        res.status(500).send('DB 에러 발생');
    }
});

module.exports = router;