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

// 웹 페이지: 교재 목록 페이지 (중복 라우트 제거, 아래 하나만 남기기)
router.get('/books-page', authenticateUser, (req, res) => {
    console.log('books-page 라우트 처리');
    res.render('/report_bookslist', { // 파일 이름을 report_bookslist로 통일
      userID: req.session?.userID || null,
      is_logined: req.session?.is_logined || false,
      role: req.session?.role || 'guest'
    });
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
        
        // 인덱스 설정
        const noIndex = 0;  // 'NO' 열 (A열)
        const categoryIndex = 1;  // '교재카테고리' 열 (B열)
        const volumeIndex = 2;  // '교재레벨-호' 열 (C열)
        const lessonNameIndex = 3;  // '차시명' 열 (D열)
        const thumbnailIndex = 4;  // 'thumbnail_url' 열 (E열)
        const ctElementIndex = 6;  // '차시CT요소' 열 (G열)
        const evalItemIndex = 7;  // '평가항목' 열 (H열)
        
        // 구글 시트 데이터에서 해당 카테고리/볼륨 필터링
        let targetCategory = '';
        
        // 카테고리 매핑
        if (category.toLowerCase() === 'preschool') {
            targetCategory = '프리스쿨 LV';
        } else if (category.toLowerCase() === 'junior') {
            targetCategory = '주니어 LV';
        } else if (category.toLowerCase() === 'cps') {
            targetCategory = 'CPS';
        } else if (category.toLowerCase() === 'cpa') {
            targetCategory = 'CPA';
        } else if (category.toLowerCase() === 'ctr_appinventor') {
            targetCategory = '앱인벤터';
        } else if (category.toLowerCase() === 'ctr_python') {
            targetCategory = '파이썬';
        } else {
            targetCategory = category;
        }
        
        // 볼륨에 해당하는 교재레벨-호 형식 (예: "프리스쿨1-1") 찾기
        const targetVolume = `${category.toLowerCase().includes('preschool') ? '프리스쿨' : category}${volume.includes('-') ? volume : `1-${volume}`}`;
        
        console.log(`목표 검색: 카테고리="${targetCategory}", 볼륨="${targetVolume}"`);
        
        // 필터링 - 정확한 교재레벨-호 매칭으로 변경
        const filteredRows = sheetData.slice(1).filter(row => {
            if (!row || row.length <= Math.max(categoryIndex, volumeIndex)) {
                return false;
            }
            
            const rowCategory = row[categoryIndex] || '';
            const rowVolume = row[volumeIndex] || '';
            
            // 카테고리와 볼륨 모두 정확히 일치해야 함
            const categoryMatch = rowCategory.includes(targetCategory);
            
            // 정확한 볼륨 매칭 (예: "프리스쿨1-1")
            const volumeMatch = rowVolume === targetVolume;
            
            // 대체 볼륨 매칭 시도 (URL에서 '1' 입력 시 '프리스쿨1-1'과 매칭)
            const altVolumeMatch = rowVolume.endsWith(`-${volume}`);
            
            const isMatch = categoryMatch && (volumeMatch || altVolumeMatch);
            
            if (isMatch) {
                console.log(`매칭된 행: ${rowCategory} / ${rowVolume}`);
            }
            
            return isMatch;
        });
        
        console.log(`필터링 결과: ${filteredRows.length}개 행 일치`);
        
        // 첫 번째 일치 항목 로깅
        if (filteredRows.length > 0) {
            console.log('첫 번째 일치 항목:', filteredRows[0]);
        }
        
        if (filteredRows.length === 0) {
            // 보다 완화된 검색 시도
            console.log('정확한 매칭 실패, 더 유연한 검색 시도...');
            
            const looseFilteredRows = sheetData.slice(1).filter(row => {
                if (!row || row.length <= Math.max(categoryIndex, volumeIndex)) {
                    return false;
                }
                
                const rowCategory = row[categoryIndex] || '';
                const rowVolume = row[volumeIndex] || '';
                
                // 카테고리 매칭
                const categoryMatch = rowCategory.includes(targetCategory);
                
                // 유연한 볼륨 매칭 (숫자만 일치)
                let rowVolumeNumber = '';
                if (rowVolume.includes('-')) {
                    const parts = rowVolume.split('-');
                    if (parts.length > 1) {
                        rowVolumeNumber = parts[1];
                    }
                }
                
                const volumeMatch = rowVolumeNumber === volume;
                
                return categoryMatch && volumeMatch;
            });
            
            if (looseFilteredRows.length > 0) {
                console.log(`유연한 검색으로 ${looseFilteredRows.length}개 행 발견`);
                return res.status(404).json({ 
                    error: '정확한 교재 정보를 찾을 수 없습니다.',
                    suggestion: '유사한 교재가 있습니다만 정확한 호수를 선택해 주세요.'
                });
            } else {
                return res.status(404).json({ error: '해당 교재 정보를 찾을 수 없습니다.' });
            }
        }
        
        // 썸네일 URL 가져오기
        let thumbnailUrl = '';
        if (filteredRows.length > 0 && thumbnailIndex < filteredRows[0].length) {
            thumbnailUrl = filteredRows[0][thumbnailIndex] || '';
        }
        
        // 평가 항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredRows.forEach(row => {
            if (row.length > Math.max(ctElementIndex, evalItemIndex)) {
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
                        console.log(`평가항목 추가: ${ctElement} - ${evalItem}`);
                    }
                }
            }
        });
        
        console.log(`평가 항목 추출: ${evaluationItems.length}개`);
        
        // 응답 데이터
        const responseData = {
            book: {
                category: category,
                volume: volume,
                title: `${category} ${volume}호`,
                thumbnail: thumbnailUrl
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