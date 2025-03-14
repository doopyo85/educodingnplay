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
router.get('/book/:category/:volume', authenticateUser, async (req, res) => {
    console.log(`교재 정보 요청 받음: 카테고리=${req.params.category}, 볼륨=${req.params.volume}`);
    
    try {
        const { category, volume } = req.params;
        
        // 시트 데이터 가져오기
        const sheetData = await getSheetData('report!A1:H1000');
        console.log(`시트 데이터 수신: ${sheetData ? sheetData.length : 0}행`);
        
        if (!sheetData || !Array.isArray(sheetData) || sheetData.length <= 1) {
            console.error('시트 데이터가 없거나 불충분합니다');
            return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
        }
        
        // 헤더 확인
        const headers = sheetData[0];
        console.log('시트 헤더:', headers);
        
        // 카테고리 인덱스와 볼륨 인덱스 찾기
        const categoryIndex = headers.indexOf('교재카테고리');
        const volumeIndex = headers.indexOf('교재레벨-호');
        const ctElementIndex = headers.indexOf('차시CT요소');
        const evalItemIndex = headers.indexOf('평가항목');
        const thumbnailIndex = headers.indexOf('thumbnail_url');
        
        console.log('열 인덱스:', {
            categoryIndex, 
            volumeIndex, 
            ctElementIndex, 
            evalItemIndex, 
            thumbnailIndex
        });
        
        // 필터링
        const filteredRows = sheetData.slice(1).filter(row => {
            // 행의 길이 확인
            if (!row || row.length <= Math.max(categoryIndex, volumeIndex)) {
                return false;
            }
            
            const rowCategory = row[categoryIndex] || '';
            let rowVolumeStr = row[volumeIndex] || '';
            
            // 볼륨 추출
            let rowVolume = rowVolumeStr;
            if (rowVolumeStr.includes('-')) {
                const parts = rowVolumeStr.split('-');
                if (parts.length > 1) {
                    rowVolume = parts[1];
                }
            }
            
            const isMatch = rowCategory.includes(category) && rowVolume.includes(volume);
            return isMatch;
        });
        
        console.log(`필터링 결과: ${filteredRows.length}개 행 일치`);
        
        if (filteredRows.length === 0) {
            console.error('일치하는 행이 없습니다');
            return res.status(404).json({ error: '해당 교재 정보를 찾을 수 없습니다.' });
        }
        
        // 일부 데이터 출력 (확인용)
        if (filteredRows.length > 0) {
            console.log('첫 번째 일치 행:', filteredRows[0]);
        }
        
        // 평가 항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredRows.forEach(row => {
            if (ctElementIndex >= 0 && evalItemIndex >= 0 && 
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
        
        console.log(`평가 항목 추출: ${evaluationItems.length}개`);
        
        // 평가 항목 확인
        if (evaluationItems.length > 0) {
            console.log('첫 번째 평가 항목:', evaluationItems[0]);
        } else {
            console.error('평가 항목이 없습니다');
        }
        
        // 응답 데이터
        const responseData = {
            book: {
                category: category,
                volume: volume,
                title: `${category} ${volume}호`,
                thumbnail: filteredRows.length > 0 && thumbnailIndex >= 0 ? 
                    filteredRows[0][thumbnailIndex] || '' : ''
            },
            evaluationItems: evaluationItems
        };
        
        console.log('응답 데이터 준비 완료');
        res.json(responseData);
    } catch (error) {
        console.error('에러 발생:', error);
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