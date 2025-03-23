// certification.js - 자격증 취득 페이지 스크립트

// 전역 변수
var currentProblemNumber = 1;
var totalProblems = 0;
var currentExamName = '';
var menuData = [];
var problemData = [];

// 페이지 초기화
function initPage() {
    console.log("Initializing certification page");
    // 1. 먼저 메뉴 데이터 로드
    loadMenuData();
}

// certification 시트에서 메뉴 데이터 로드
function loadMenuData() {
    console.log("Loading menu data");
    fetch('/api/get-certification-data')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                console.log("Menu data loaded:", data);
                menuData = data;
                renderNavigationMenu(data);
                
                // 2. 메뉴 로드 후 문제 데이터 로드
                loadProblemData();
            } else {
                console.log('No menu data found.');
            }
        })
        .catch(error => {
            console.error('Error loading menu data:', error);
        });
}

// problems 시트에서 문제 데이터 로드
function loadProblemData() {
    console.log("Loading problem data");
    fetch('/api/get-problem-data')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                console.log("Problem data loaded:", data);
                problemData = data;
                
                // 3. 두 데이터 모두 로드 완료 후 첫 번째 메뉴 선택
                if (menuData && menuData.length > 0) {
                    // 첫 번째 메뉴 자동 선택
                    const firstCategory = menuData[0][0];
                    const firstMenu = {
                        category: firstCategory,
                        title: menuData[0][1],
                        url: menuData[0][2],
                        index: 0
                    };
                    
                    console.log("Auto-selecting first menu:", firstMenu);
                    onMenuSelect(firstMenu);
                }
            } else {
                console.log('No problem data found.');
            }
        })
        .catch(error => {
            console.error('Error loading problem data:', error);
        });
}

// 네비게이션 메뉴 렌더링 (python_project.js 스타일로 변경)
function renderNavigationMenu(data) {
    console.log("Rendering navigation menu");
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
            topLevelMenus.get(category).push({ index, title, url, category });
        }
    });

    let index = 0;
    
    // 각 상위 메뉴 생성
    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu, index);
        const subMenuItems = createSubMenuItems(subMenus, index);
        navList.appendChild(topLevelMenuItem);
        navList.appendChild(subMenuItems);
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

    return topLevelMenuItem;
}

// 하위 메뉴 아이템 생성
function createSubMenuItems(subMenus, index) {
    const subMenuContainer = document.createElement('div');
    subMenuContainer.id = `collapse${index}`;
    subMenuContainer.classList.add('collapse');

    const subMenuList = document.createElement('ul');
    subMenuList.classList.add('list-unstyled', 'pl-3');

    subMenus.forEach(function(item) {
        const subMenuItem = document.createElement('li');
        subMenuItem.classList.add('menu-item', 'submenu-item');
        subMenuItem.setAttribute('data-url', item.url);

        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-file-text', 'me-2');
        subMenuItem.appendChild(icon);

        const text = document.createTextNode(item.title);
        subMenuItem.appendChild(text);

        subMenuItem.addEventListener('click', function(event) {
            console.log("Submenu item clicked:", item);
            event.stopPropagation();
            onMenuSelect(item);
            applySubMenuHighlight(subMenuItem);
        });

        subMenuList.appendChild(subMenuItem);
    });

    subMenuContainer.appendChild(subMenuList);
    return subMenuContainer;
}

// 하위 메뉴 선택 시 처리
function onMenuSelect(item) {
    console.log("Menu selected:", item);
    
    // 선택된 메뉴 정보 저장
    currentExamName = item.title;
    
    // iframe 직접 업데이트 (python_project 스타일)
    const iframe = document.getElementById('iframeContent');
    if (iframe && item.url) {
        console.log("Setting iframe src to:", item.url);
        iframe.src = item.url;
    } else {
        console.error("Cannot update iframe content: iframe or URL not found");
        console.log("iframe element:", iframe);
        console.log("item URL:", item.url);
    }

    // 현재 선택된 메뉴에 해당하는 문제들 찾기
    const matchingProblems = problemData.filter(problem => {
        return problem[0].toLowerCase() === item.category.toLowerCase();
    });
    
    console.log("Matching problems:", matchingProblems);

    // 문제 개수 저장
    totalProblems = matchingProblems.length;

    // 첫 번째 문제 로드
    currentProblemNumber = 1;
    if (totalProblems > 0) {
        updateProblemInfo(item.title, currentProblemNumber, totalProblems);
    } else {
        console.log('No matching problems found for:', item.title);
    }
}

// 문제 정보 업데이트 (제목, 번호 등)
function updateProblemInfo(title, currentNumber, total) {
    const problemTitle = document.getElementById('problem-title');
    const problemNavigation = document.getElementById('problem-navigation');
    
    if (problemTitle) {
        problemTitle.textContent = title;
    }
    
    if (problemNavigation) {
        problemNavigation.textContent = `${currentNumber} / ${total}`;
    }
    
    updateNavigationButtons(currentNumber, total);
    renderProblemNavigation();
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
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 선택된 하위 메뉴 아이템에 active 클래스 추가
    selectedItem.classList.add('active');
}

// 문제 내비게이션 렌더링
function renderProblemNavigation() {
    const navContainer = document.getElementById('problem-navigation');
    if (!navContainer) return;

    // 기존 버튼 제거하고 컨테이너 초기화
    const navigationContainer = document.getElementById('problem-navigation-container');
    if (navigationContainer) {
        // 이전/다음 버튼과 문제 번호 표시는 유지
        const prevButton = document.getElementById('prev-problem');
        const nextButton = document.getElementById('next-problem');
        const problemNav = document.getElementById('problem-navigation');
        
        // 기존 버튼들 제거
        navigationContainer.querySelectorAll('.problem-buttons').forEach(el => el.remove());
        
        // 새 버튼 컨테이너 생성
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'problem-buttons';
        
        // 문제 버튼 생성 (최대 10개)
        for (let i = 1; i <= Math.min(totalProblems, 10); i++) {
            const problemBtn = document.createElement('i');
            problemBtn.classList.add('bi', 'problem-icon');
            
            if (i === currentProblemNumber) {
                problemBtn.classList.add(i === 10 ? 'bi-0-circle-fill' : `bi-${i}-circle-fill`);
            } else {
                problemBtn.classList.add(i === 10 ? 'bi-0-circle' : `bi-${i}-circle`);
            }
            
            problemBtn.addEventListener('click', function() {
                navigateToProblem(i);
            });

            buttonsContainer.appendChild(problemBtn);
        }
        
        // 새 버튼 컨테이너 추가
        navigationContainer.appendChild(buttonsContainer);
    }
}

// 특정 문제로 이동
function navigateToProblem(problemNumber) {
    console.log("Navigating to problem:", problemNumber);
    currentProblemNumber = problemNumber;
    
    // 현재 선택된 하위 메뉴 항목 찾기
    const activeMenuItem = document.querySelector('.submenu-item.active');
    if (activeMenuItem) {
        // 메뉴 URL 가져오기
        const url = activeMenuItem.getAttribute('data-url');
        console.log("Active menu URL:", url);
        
        // iframe 업데이트
        const iframe = document.getElementById('iframeContent');
        if (iframe && url) {
            iframe.src = url;
        }
        
        // 문제 정보 업데이트
        const title = activeMenuItem.textContent.trim();
        updateProblemInfo(title, problemNumber, totalProblems);
    } else {
        console.warn("No active menu item found");
    }
}

// 이전/다음 버튼 업데이트
function updateNavigationButtons(currentNumber, totalProblems) {
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');
    
    if (!prevButton || !nextButton) {
        console.warn("Navigation buttons not found");
        return;
    }
    
    // 이전 버튼 비활성화 여부
    if (currentNumber <= 1) {
        prevButton.classList.add('disabled');
    } else {
        prevButton.classList.remove('disabled');
    }
    
    // 다음 버튼 비활성화 여부
    if (currentNumber >= totalProblems) {
        nextButton.classList.add('disabled');
    } else {
        nextButton.classList.remove('disabled');
    }
}

// 문서 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // 페이지 초기화
    initPage();
    
    // 이전/다음 버튼 이벤트 처리
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (currentProblemNumber > 1) {
                navigateToProblem(currentProblemNumber - 1);
            }
        });
    } else {
        console.warn("Previous button not found");
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentProblemNumber < totalProblems) {
                navigateToProblem(currentProblemNumber + 1);
            }
        });
    } else {
        console.warn("Next button not found");
    }
    
    // 디버깅을 위해 전역 객체에 함수 노출
    window.certDebug = {
        loadMenuData: loadMenuData,
        loadProblemData: loadProblemData,
        onMenuSelect: onMenuSelect,
        navigateToProblem: navigateToProblem
    };
});