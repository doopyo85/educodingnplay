// 월간 학습 리포트 POD 기능을 위한 라우터
const express = require('express');
const router = express.Router();
const { getSheetData } = require('../server'); // server.js에서 내보낸 함수 사용
const { authenticateUser } = require('../lib_login/authMiddleware');

// 캐시 저장소
let reportDataCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간(1일) 캐시 유효기간

// 캐시 업데이트 함수
async function updateReportCache() {
    try {
        console.log('Updating report data cache from Google Sheets...');
        const sheetData = await getSheetData('report!A1:Z1000'); // 전체 데이터 범위 가져오기
        
        if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
            console.error('Failed to fetch report data: Empty or invalid response');
            return false;
        }
        
        // 헤더 행 추출
        const headers = sheetData[0];
        
        // 데이터 객체로 변환 (헤더를 키로 사용)
        const parsedData = sheetData.slice(1).map(row => {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        });
        
        // 데이터를 카테고리별로 정리
        const categorizedData = {};
        parsedData.forEach(item => {
            const category = item.category || '기타';
            
            if (!categorizedData[category]) {
                categorizedData[category] = [];
            }
            
            categorizedData[category].push(item);
        });
        
        // 캐시 저장 및 타임스탬프 업데이트
        reportDataCache = categorizedData;
        lastCacheUpdate = Date.now();
        console.log(`Report data cache updated with ${parsedData.length} items`);
        return true;
    } catch (error) {
        console.error('Error updating report cache:', error);
        return false;
    }
}

// 캐시된 데이터 가져오기
async function getReportData() {
    // 캐시가 없거나 만료된 경우 업데이트
    if (!reportDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
        const success = await updateReportCache();
        if (!success && !reportDataCache) {
            throw new Error('Failed to initialize report data cache');
        }
    }
    
    return reportDataCache;
}

// 서버 시작 시 캐시 초기화
updateReportCache().catch(err => {
    console.error('Initial cache update failed:', err);
});

// 일별 새벽 4시에 캐시 자동 갱신
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
        console.log('Scheduled cache update...');
        await updateReportCache();
    }
}, 60000); // 1분마다 확인

// API 엔드포인트: 교재 카테고리 및 목록 가져오기
router.get('/books', authenticateUser, async (req, res) => {
    try {
        const reportData = await getReportData();
        res.json(reportData);
    } catch (error) {
        console.error('Error fetching book list:', error);
        res.status(500).json({ error: '교재 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// API 엔드포인트: 특정 교재 정보 및 평가 항목 가져오기
router.get('/book/:category/:volume', authenticateUser, async (req, res) => {
    try {
        const { category, volume } = req.params;
        const reportData = await getReportData();
        
        // 해당 카테고리가 없는 경우
        if (!reportData[category]) {
            return res.status(404).json({ error: '해당 카테고리를 찾을 수 없습니다.' });
        }
        
        // 해당 볼륨 찾기
        const bookData = reportData[category].find(item => 
            item.volume && item.volume.toString() === volume.toString()
        );
        
        if (!bookData) {
            return res.status(404).json({ error: '해당 호수의 교재를 찾을 수 없습니다.' });
        }
        
        // 해당 교재의 평가 항목 구성
        const evaluationItems = [];
        const ctPrinciples = ['추상화', '분해', '패턴인식', '알고리즘'];
        
        // 교재에 해당하는 평가 항목 생성
        for (let i = 1; i <= 8; i++) {
            const principleField = `ct_principle_${i}`;
            const descriptionField = `evaluation_${i}`;
            
            if (bookData[principleField] && bookData[descriptionField]) {
                evaluationItems.push({
                    id: i,
                    principle: bookData[principleField],
                    description: bookData[descriptionField]
                });
            }
        }
        
        res.json({
            book: {
                category: bookData.category,
                volume: bookData.volume,
                title: bookData.title || `${bookData.category} ${bookData.volume}호`,
                thumbnail: bookData.thumbnail_url || '/img/book_placeholder.png'
            },
            evaluationItems: evaluationItems
        });
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).json({ error: '교재 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 웹 페이지: 교재 목록 페이지
router.get('/books-page', authenticateUser, (req, res) => {
    res.render('report/books', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'guest'
    });
});

// 웹 페이지: 학습 리포트 생성 페이지
router.get('/generate/:category/:volume', authenticateUser, (req, res) => {
    res.render('report/generate', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'guest',
        category: req.params.category,
        volume: req.params.volume
    });
});

module.exports = router;