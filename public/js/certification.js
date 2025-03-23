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

// 네비게이션 메뉴 렌더링 (python_project.js 스타일로 변경)
function renderNavigationMenu(data) {
    const navList = document.getElementById('navList');
    if (!navList) {
        console.error('Navigation list element not found');
        return;
    }

    navList.innerHTML = ''; // 기존 메뉴 아이템 삭제

    // 데이터 그룹화
    const topLevelMenus = new Map();
    data.forEach(function(row, index) {
        if (row && row.length >= 3) {
            const category = row[0] || 'Uncategorized';
            const title = row[1] || '';
            const url = row[2] || '';
            
            if (!topLevelMenus.has(category)) {
                topLevelMenus.set(category, []);
            }
            topLevelMenus.get(category).push({ index, title, url });
        }
    });

    let index = 0;
    let firstSubmenu = null;
    
    // 각 상위 메뉴 생성
    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu, index);
        const subMenuItems = createSubMenuItems(subMenus, index, data);
        navList.appendChild(topLevelMenuItem);
        navList.appendChild(subMenuItems);

        // 첫 번째 하위 메뉴 저장
        if (index === 0 && subMenus.length > 0) {
            firstSubmenu = subMenus[0];
        }        

        index++;
    });

    // Bootstrap의 collapse 기능 초기화 및 이벤트 리스너 추가
    if (typeof bootstrap !== 'undefined') {
        var collapseElementList = [].slice.call(document.querySelectorAll('.collapse'));
        collapseElementList.forEach(function(collapseEl) {
            var collapse = new bootstrap.Collapse(collapseEl, {
                toggle: false
            });

            collapseEl.addEventListener('show.bs.collapse', function() {
                // 다른 모든 열린 메뉴 닫기
                collapseElementList.forEach(function(el) {
                    if (el !== collapseEl && el.classList.contains('show')) {
                        bootstrap.Collapse.getInstance(el).hide();
                    }
                });
            });
        });

        // 동일한 대메뉴를 클릭할 때 하위 메뉴 토글
        document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(function(el) {
            el.addEventListener('click', function(event) {
                event.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                const bsCollapse = bootstrap.Collapse.getInstance(target);
                if (bsCollapse) {
                    if (target.classList.contains('show')) {
                        bsCollapse.hide();
                    } else {
                        // 다른 열린 메뉴 닫기
                        document.querySelectorAll('.collapse.show').forEach(function(openMenu) {
                            if (openMenu !== target) {
                                bootstrap.Collapse.getInstance(openMenu).hide();
                            }
                        });
                        bsCollapse.show();
                    }
                }
                updateToggleIcon(this);
            });
        });
    } else {
        console.warn('Bootstrap not loaded, collapse functionality will not work');
    }

    // 첫 번째 하위 메뉴 자동 선택
    if (firstSubmenu) {
        onMenuSelect(firstSubmenu, data);
    }
}

// 상위 메뉴 아이템 생성
function createTopLevelMenuItem(topLevelMenu, index) {
    const topLevelMenuItem = document.createElement('li');
    topLevelMenuItem.classList.add('menu-item');

    const link = document.createElement('a');
    link.href = `#collapse${index}`;
    link.setAttribute('data-bs-toggle', 'collapse');
    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    link.setAttribute('aria-controls', `collapse${index}`);
    link.textContent = topLevelMenu;
    link.classList.add('d-flex', 'justify-content-between', 'align-items-center');

    const arrow = document.createElement('i');
    arrow.classList.add('bi', 'bi-chevron-down');
    link.appendChild(arrow);

    topLevelMenuItem.appendChild(link);

    // 화살표 아이콘 회전을 위한 이벤트 리스너 추가
    link.addEventListener('click', function() {
        arrow.classList.toggle('rotate');
    });

    return topLevelMenuItem;
}

// 하위 메뉴 아이템 생성
function createSubMenuItems(subMenus, index, allData) {
    const subMenuContainer = document.createElement('div');
    subMenuContainer.id = `collapse${index}`;
    subMenuContainer.classList.add('collapse');

    const subMenuList = document.createElement('ul');
    subMenuList.classList.add('list-unstyled', 'pl-3');

    subMenus.forEach(function(item) {
        const subMenuItem = document.createElement('li');
        subMenuItem.classList.add('menu-item');

        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-file-text', 'me-2');
        subMenuItem.appendChild(icon);

        const text = document.createTextNode(item.title);
        subMenuItem.appendChild(text);

        subMenuItem.addEventListener('click', function(event) {
            event.stopPropagation();
            onMenuSelect(item, allData);
            applySubMenuHighlight(subMenuItem);
        });

        subMenuList.appendChild(subMenuItem);
    });

    subMenuContainer.appendChild(subMenuList);
    return subMenuContainer;
}

// 하위 메뉴 선택 시 처리
function onMenuSelect(item, allData) {
    const url = item.url;
    const index = item.index;
    
    // 현재 선택된 메뉴 정보 저장
    currentExamName = item.title;
    currentProblemNumber = parseInt(index) + 1;
    
    // 문제 로드
    loadProblem(url, index, allData);
}

// 아이콘을 변경하는 함수
function updateToggleIcon(element) {
    const icon = element.querySelector('.bi');
    if (icon) {
        if (element.getAttribute('aria-expanded') === 'true') {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-up');
        } else {
            icon.classList.remove('bi-chevron-up');
            icon.classList.add('bi-chevron-down');
        }
    }
}

// 하위 메뉴 클릭 시 상위 메뉴에 active 클래스 제거, 클릭된 메뉴에 active 클래스 추가
function applySubMenuHighlight(selectedItem) {
    // 모든 메뉴 아이템에서 active 클래스 제거
    document.querySelectorAll('.nav-container .menu-item, .nav-container .sub-menu .menu-item').forEach(item => item.classList.remove('active'));
    
    // 선택된 하위 메뉴 아이템에 active 클래스 추가
    selectedItem.classList.add('active');
    
    // 상위 메뉴 아이템에 active 클래스 제거
    let parentCollapse = selectedItem.closest('.collapse');
    if (parentCollapse) {
        let parentMenuItem = document.querySelector(`[href="#${parentCollapse.id}"]`).closest('.menu-item');
        parentMenuItem.classList.remove('active');
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
    const items = document.querySelectorAll('.menu-item');
    for (let i = 0; i < items.length; i++) {
        if (i === index) {
            items[i].click();
            break;
        }
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
        if (currentProblemNumber > 1) {
            navigateToProblem(currentProblemNumber - 2);
        }
    });
    
    document.getElementById('next-problem').addEventListener('click', function() {
        if (currentProblemNumber < totalProblems) {
            navigateToProblem(currentProblemNumber);
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
        
        .menu-item {
            padding: 8px 15px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        
        .menu-item:hover {
            background-color: #f8f9fa;
        }
        
        .menu-item.active {
            background-color: #e9ecef;
            font-weight: bold;
        }
        
        .rotate {
            transform: rotate(180deg);
            transition: transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
});