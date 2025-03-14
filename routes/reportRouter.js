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
            // 구글 시트의 컬럼명을 확인
            const category = item['교재카테고리'] || '기타';
            
            // 레벨-호 형식에서 볼륨(호수) 추출
            let volume = '1';
            if (item['교재레벨-호']) {
                const parts = item['교재레벨-호'].split('-');
                if (parts.length > 1) {
                    volume = parts[1];
                }
            }
            
            // 카테고리가 없는 경우 생성
            if (!categorizedData[category]) {
                categorizedData[category] = [];
            }
            
            // 이미 추가된 볼륨인지 확인
            const existingVolume = categorizedData[category].find(book => 
                book.volume === volume
            );
            
            // 중복된 볼륨이 없을 경우에만 추가
            if (!existingVolume) {
                categorizedData[category].push({
                    category: category,
                    volume: volume,
                    title: `${category} ${volume}호`,
                    thumbnail_url: item['thumbnail_url'] || ''
                });
            }
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
// API 엔드포인트: 특정 교재 정보 및 평가 항목 가져오기
router.get('/book/:category/:volume', authenticateUser, async (req, res) => {
    try {
        const { category, volume } = req.params;
        
        // 원본 시트 데이터에서 직접 가져오기
        const sheetData = await getSheetData('report!A1:H1000');
        
        if (!sheetData || !Array.isArray(sheetData) || sheetData.length <= 1) {
            return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
        }
        
        // 헤더 행 추출
        const headers = sheetData[0];
        
        // 데이터 객체로 변환 (헤더를 키로 사용)
        const parsedData = sheetData.slice(1).map(row => {
            const item = {};
            headers.forEach((header, index) => {
                if (index < row.length) {
                    item[header] = row[index] || '';
                } else {
                    item[header] = '';
                }
            });
            return item;
        });
        
        // 카테고리 인덱스와 볼륨 인덱스 찾기
        const categoryIndex = headers.findIndex(h => h === '교재카테고리');
        const volumeIndex = headers.findIndex(h => h === '교재레벨-호');
        const thumbnailIndex = headers.findIndex(h => h === 'thumbnail_url');
        const ctElementIndex = headers.findIndex(h => h === '차시CT요소');
        const evalItemIndex = headers.findIndex(h => h === '평가항목');
        
        // 인덱스가 적절하게 찾아졌는지 확인
        if (categoryIndex === -1 || volumeIndex === -1) {
            return res.status(500).json({ error: '시트 구조가 예상과 다릅니다.' });
        }
        
        // 해당 카테고리와 볼륨에 맞는 행만 필터링
        const filteredRows = sheetData.slice(1).filter(row => {
            if (row.length <= Math.max(categoryIndex, volumeIndex)) {
                return false;
            }
            
            const rowCategory = row[categoryIndex] || '';
            const rowVolumeStr = row[volumeIndex] || '';
            
            // 볼륨 추출
            let rowVolume = '';
            if (rowVolumeStr) {
                const parts = rowVolumeStr.split('-');
                if (parts.length > 1) {
                    rowVolume = parts[1];
                }
            }
            
            return rowCategory === category && rowVolume === volume;
        });
        
        if (filteredRows.length === 0) {
            return res.status(404).json({ error: '해당 교재 정보를 찾을 수 없습니다.' });
        }
        
        // 교재 정보
        const thumbnail = filteredRows[0][thumbnailIndex] || '';
        
        // 고유한 CT요소와 평가항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredRows.forEach((row, idx) => {
            if (ctElementIndex !== -1 && evalItemIndex !== -1 && 
                row.length > Math.max(ctElementIndex, evalItemIndex)) {
                
                const ctElement = row[ctElementIndex];
                const evalItem = row[evalItemIndex];
                
                if (ctElement && evalItem) {
                    const itemKey = `${ctElement}-${evalItem}`;
                    
                    if (!processedItems.has(itemKey)) {
                        processedItems.add(itemKey);
                        evaluationItems.push({
                            id: evaluationItems.length + 1,
                            principle: ctElement,
                            description: evalItem
                        });
                    }
                }
            }
        });
        
        console.log(`Found ${evaluationItems.length} evaluation items for ${category} ${volume}`);
        
        res.json({
            book: {
                category: category,
                volume: volume,
                title: `${category} ${volume}호`,
                thumbnail: thumbnail
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