// 전역 변수 선언을 파일 맨 위로 이동하고 모두 var로 변경
var currentProblemNumber = 1;
var totalProblems = 0;  // 초기값을 0으로 설정
var currentExamName = '';
var problemData = [];

document.addEventListener("DOMContentLoaded", function() {
    if (!window.menuLoaded) {
        const googleApiKey = document.getElementById('googleApiKey').value;
        const spreadsheetId = document.getElementById('spreadsheetId').value;

        if (googleApiKey && spreadsheetId) {
            if (typeof gapi !== 'undefined') {
                gapi.load('client', initClient);
            } else {
                console.error('Google API not loaded');
            }
        } else {
            console.error('Required elements not found');
        }

        window.menuLoaded = true;
    }
    setupEventListeners(); // 여기에 추가
});

// 데이터 로딩을 기다리는 함수
function waitForDataLoading() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkData = () => {
            if (typeof menuData !== 'undefined' && menuData) {
                resolve();
            } else if (attempts < 20) {  // 최대 10초 대기
                attempts++;
                setTimeout(checkData, 500);
            } else {
                reject(new Error("Data loading timeout"));
            }
        };
        checkData();
    });
}
document.addEventListener("DOMContentLoaded", function() {
    loadMenuData(); // 서버에서 메뉴 데이터 로드
    setupEventListeners(); // 이벤트 리스너 설정
});

// 서버에서 메뉴 데이터 가져오기
async function loadMenuData() {
    try {
        const response = await fetch('/api/get-teachermenu-data'); // 서버의 API 호출
        const menuData = await response.json();
        if (menuData && menuData.length > 0) {
            renderMenu(menuData); // 메뉴 렌더링
            loadProblemData();    // 문제 데이터 로드
        } else {
            throw new Error('No menu data loaded');
        }
    } catch (error) {
        console.error('Error loading menu data:', error);
    }
}


function setupEventListeners() {
    const runCodeBtn = document.getElementById('runCodeBtn');
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    // Ace 에디터와 연동된 코드 실행
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', function() {
            var editor = ace.edit("editor");  // Ace 에디터 가져오기
            const code = editor.getValue();  // 에디터에서 코드 가져오기
            document.getElementById('output-content').innerText = `Running code:\n${code}`;
        });
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentProblemNumber > 1) {
                navigateToProblem(currentProblemNumber - 1);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentProblemNumber < totalProblems) {
                navigateToProblem(currentProblemNumber + 1);
            }
        });
    }

    fetchUserData();
}


function fetchUserData() {
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        fetch('/get-user', { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text(); // JSON.parse 대신 text()를 사용
            })
            .then(data => {
                try {
                    const jsonData = JSON.parse(data);
                    userNameElement.innerText = jsonData.username || "로그인 정보 미확인";
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    userNameElement.innerText = "로그인 정보 미확인";
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                userNameElement.innerText = "로그인 정보 미확인";
            });
    }
}
  
function renderMenu(data) {
    const navList = document.getElementById('navList');
    if (!navList) {
        console.error('Navigation list element not found');
        return;
    }

    navList.innerHTML = ''; // Clear existing menu items

    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('Invalid menu data');
        return;
    }

    const topLevelMenus = new Map();
    data.forEach(function(row) {
        if (row && row.length >= 3) {
            const [topLevelMenu, subMenu, examName] = row;
            if (!topLevelMenus.has(topLevelMenu)) {
                topLevelMenus.set(topLevelMenu, []);
            }
            topLevelMenus.get(topLevelMenu).push({ subMenu, examName });
        }
    });

    let index = 0;
    let firstSubmenu = null;
    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu, index);
        const subMenuItems = createSubMenuItems(subMenus, index);
        navList.appendChild(topLevelMenuItem);
        navList.appendChild(subMenuItems);

        // 첫 번째 하위 메뉴 저장
        if (index === 0 && subMenus.length > 0) {
            firstSubmenu = subMenus[0];
        }        

        index++;
    });

    // Bootstrap의 collapse 기능 초기화 및 이벤트 리스너 추가
    var collapseElementList = [].slice.call(document.querySelectorAll('.collapse'))
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

    // 첫 번째 하위 메뉴 자동 선택
    if (firstSubmenu) {
        onMenuSelect(firstSubmenu.examName);
    }    
});
    
    // 아이콘 변경
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
}  


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

function createSubMenuItems(subMenus, index) {
    const subMenuContainer = document.createElement('div');
    subMenuContainer.id = `collapse${index}`;
    subMenuContainer.classList.add('collapse');

    const subMenuList = document.createElement('ul');
    subMenuList.classList.add('list-unstyled', 'pl-3');

    subMenus.forEach(function({ subMenu, examName }) {
        const subMenuItem = document.createElement('li');
        subMenuItem.classList.add('menu-item');

        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-file-text', 'me-2');
        subMenuItem.appendChild(icon);

        const text = document.createTextNode(subMenu);
        subMenuItem.appendChild(text);

        subMenuItem.addEventListener('click', function(event) {
            event.stopPropagation();
            onMenuSelect(examName);
            applySubMenuHighlight(subMenuItem);
        });

        subMenuList.appendChild(subMenuItem);
    });

    subMenuContainer.appendChild(subMenuList);
    return subMenuContainer;
}

// 아이콘을 변경하는 함수
function toggleArrow(arrow, isOpen) {
    if (isOpen) {
        arrow.classList.remove('bi-chevron-down');
        arrow.classList.add('bi-chevron-up');
    } else {
        arrow.classList.remove('bi-chevron-up');
        arrow.classList.add('bi-chevron-down');
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


function resizeIframe(iframe) {
    if (!iframe) return;

    const container = document.getElementById('problem-container');
    if (!container) return;

    const containerHeight = container.clientHeight;
    iframe.style.height = containerHeight + 'px';

    // cross-origin 접근 시도 제거
    iframe.onload = function() {
        iframe.style.height = containerHeight + 'px';
    };
}

// 창 크기가 변경될 때마다 iframe 크기를 조정합니다
window.addEventListener('resize', function() {
    const iframe = document.getElementById('iframeContent');
    if (iframe) {
        resizeIframe(iframe);
    }
});

// Ensure content and IDE are loaded and displayed side by side
window.addEventListener('load', function() {
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.style.display = 'flex'; // Set the display as flex for horizontal layout
    }
});