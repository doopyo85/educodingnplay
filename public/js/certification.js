// certification.js - 자격증 취득 페이지 스크립트

// 전역 변수
var currentProblemNumber = 1;
var totalProblems = 0;
var currentExamName = '';

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
            totalProblems = data.length; // 총 문제 수 저장
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
    
    // 현재 문제 번호 업데이트
    currentProblemNumber = parseInt(index) + 1;
    
    // 문제 번호와 총 문제 수 표시
    totalProblems = allData.length;
    problemNavigation.textContent = `${currentProblemNumber} / ${totalProblems}`;
    
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
    
    // 문제 내비게이션 버튼 업데이트
    renderProblemNavigation();
}

// 문제 내비게이션 렌더링
function renderProblemNavigation() {
    const navContainer = document.getElementById('problem-navigation');
    if (!navContainer) return;

    // 내비게이션 버튼 컨테이너
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'problem-buttons';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.marginTop = '10px';
    
    // 기존 버튼 제거
    const existingButtons = document.querySelector('.problem-buttons');
    if (existingButtons) {
        existingButtons.parentNode.removeChild(existingButtons);
    }

    for (let i = 1; i <= Math.min(totalProblems, 10); i++) {
        const problemBtn = document.createElement('i');
        problemBtn.classList.add('bi', 'problem-icon');
        
        if (i === currentProblemNumber) {
            problemBtn.classList.add(i === 10 ? 'bi-0-circle-fill' : `bi-${i}-circle-fill`);
        } else {
            problemBtn.classList.add(i === 10 ? 'bi-0-circle' : `bi-${i}-circle`);
        }
        
        problemBtn.style.margin = '0 5px';
        problemBtn.style.cursor = 'pointer';
        problemBtn.style.fontSize = '20px';
        
        problemBtn.addEventListener('click', function() {
            navigateToProblem(i - 1);
        });

        buttonsContainer.appendChild(problemBtn);
    }

    // 버튼 컨테이너를 문제 내비게이션 컨테이너에 추가
    const navigationContainer = document.getElementById('problem-navigation-container');
    if (navigationContainer) {
        navigationContainer.appendChild(buttonsContainer);
    }
}

// 특정 문제로 이동
function navigateToProblem(index) {
    const item = document.querySelector(`.nav-item[data-index="${index}"]`);
    if (item) {
        item.click();
    }
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
    
    // 문제 버튼에 CSS 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .problem-icon {
            cursor: pointer;
            font-size: 24px;
            margin: 0 5px;
        }
        
        [class*="-circle-fill"] {
            color: #007bff;
        }
        
        [class*="-circle"]:not([class*="-circle-fill"]) {
            color: #6c757d;
        }
        
        .problem-icon:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
});