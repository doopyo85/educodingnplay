// certification.js - 자격증 취득 페이지 스크립트

// 구글 API 초기화 및 메뉴 로드
function initGoogleApi() {
    const apiKey = document.getElementById('googleApiKey').value;
    const spreadsheetId = document.getElementById('spreadsheetId').value;
    
    gapi.load('client', () => {
        gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        }).then(() => {
            // certification 시트에서 데이터 로드
            loadCertificationData(spreadsheetId);
        }).catch(error => {
            console.error('Error initializing Google API:', error);
        });
    });
}

// certification 시트에서 데이터 로드
function loadCertificationData(spreadsheetId) {
    // certification 시트의 A2:E 범위 데이터 가져오기
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'certification!A2:E'  // certification 시트에서 데이터 가져오기
    }).then(response => {
        const data = response.result.values;
        if (data && data.length > 0) {
            renderNavigationMenu(data);
            // 첫 번째 문제 로드
            if (data[0] && data[0][1]) {
                loadProblem(data[0][1], 0, data);
            }
        } else {
            console.log('No data found in certification sheet.');
        }
    }).catch(error => {
        console.error('Error loading certification data:', error);
    });
}

// 네비게이션 메뉴 렌더링
function renderNavigationMenu(data) {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';
    
    // 메뉴 그룹화를 위한 객체
    const menuGroups = {};
    
    // 데이터 그룹화
    data.forEach((row, index) => {
        if (row.length >= 2) {
            const category = row[0] || 'Uncategorized';
            if (!menuGroups[category]) {
                menuGroups[category] = [];
            }
            menuGroups[category].push({ index, title: row[1], url: row[2] });
        }
    });
    
    // 그룹화된 메뉴 렌더링
    Object.keys(menuGroups).forEach(category => {
        const groupContainer = document.createElement('li');
        groupContainer.className = 'nav-group';
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'nav-group-header';
        groupHeader.textContent = category;
        groupContainer.appendChild(groupHeader);
        
        const groupItems = document.createElement('ul');
        groupItems.className = 'nav-group-items';
        
        menuGroups[category].forEach(item => {
            const menuItem = document.createElement('li');
            menuItem.className = 'nav-item';
            menuItem.textContent = item.title;
            menuItem.dataset.index = item.index;
            menuItem.dataset.url = item.url;
            
            menuItem.addEventListener('click', function() {
                // 모든 메뉴 아이템에서 active 클래스 제거
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.remove('active');
                });
                
                // 클릭한 메뉴 아이템에 active 클래스 추가
                this.classList.add('active');
                
                // 문제 로드
                loadProblem(item.url, item.index, data);
            });
            
            groupItems.appendChild(menuItem);
        });
        
        groupContainer.appendChild(groupItems);
        navList.appendChild(groupContainer);
    });
    
    // 첫 번째 메뉴 아이템 활성화
    const firstMenuItem = document.querySelector('.nav-item');
    if (firstMenuItem) {
        firstMenuItem.classList.add('active');
    }
}

// 문제 로드 및 표시
function loadProblem(url, index, allData) {
    const iframe = document.getElementById('iframeContent');
    const problemTitle = document.getElementById('problem-title');
    const problemNavigation = document.getElementById('problem-navigation');
    
    // 문제 번호와 총 문제 수 표시
    const totalProblems = allData.length;
    problemNavigation.textContent = `${parseInt(index) + 1} / ${totalProblems}`;
    
    // 문제 제목 설정
    if (allData[index] && allData[index][1]) {
        problemTitle.textContent = allData[index][1];
    }
    
    // iframe에 문제 콘텐츠 로드
    if (url) {
        iframe.src = url;
    } else {
        iframe.src = 'about:blank';
        iframe.contentDocument.body.innerHTML = '<div class="error-message">문제 URL이 없습니다.</div>';
    }
    
    // 학습 추적 이벤트 기록 (있는 경우)
    if (window.learningTracker) {
        window.learningTracker.trackEvent('problem_view', {
            problemIndex: index,
            problemTitle: allData[index] ? allData[index][1] : 'Unknown'
        });
    }
    
    // 이전/다음 버튼 업데이트
    updateNavigationButtons(index, totalProblems);
}

// 이전/다음 버튼 업데이트
function updateNavigationButtons(currentIndex, totalProblems) {
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');
    
    // 이전 버튼 비활성화 여부
    if (currentIndex <= 0) {
        prevButton.classList.add('disabled');
    } else {
        prevButton.classList.remove('disabled');
    }
    
    // 다음 버튼 비활성화 여부
    if (currentIndex >= totalProblems - 1) {
        nextButton.classList.add('disabled');
    } else {
        nextButton.classList.remove('disabled');
    }
}

// 문서 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    // Google API 초기화
    initGoogleApi();
    
    // 이전/다음 버튼 이벤트 처리
    document.getElementById('prev-problem').addEventListener('click', function() {
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) {
            const currentIndex = parseInt(activeItem.dataset.index);
            if (currentIndex > 0) {
                const prevItem = document.querySelector(`.nav-item[data-index="${currentIndex - 1}"]`);
                if (prevItem) {
                    prevItem.click();
                }
            }
        }
    });
    
    document.getElementById('next-problem').addEventListener('click', function() {
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) {
            const currentIndex = parseInt(activeItem.dataset.index);
            const nextItem = document.querySelector(`.nav-item[data-index="${currentIndex + 1}"]`);
            if (nextItem) {
                nextItem.click();
            }
        }
    });
});