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

    navList.innerHTML = ''; // 기존 메뉴 초기화

    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error('Invalid menu data');
        return;
    }

    const topLevelMenus = new Map();
    data.forEach(function(row) {
        if (row && row.length >= 3) {
            const [topLevelMenu, subMenu, url] = row;
            if (!topLevelMenus.has(topLevelMenu)) {
                topLevelMenus.set(topLevelMenu, []);
            }
            topLevelMenus.get(topLevelMenu).push({ subMenu, url });
        }
    });

    let index = 0;
    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const hasSubMenus = subMenus.some(item => item.subMenu.trim() !== ""); // 서브메뉴 존재 여부 확인
        const topLevelMenuItem = document.createElement('li');
        topLevelMenuItem.classList.add('menu-item');

        const link = document.createElement('a');
        link.href = hasSubMenus ? `#collapse${index}` : subMenus[0].url; // 서브메뉴가 없으면 URL로 이동
        link.setAttribute('role', 'button');
        link.classList.add('d-flex', 'justify-content-between', 'align-items-center');
        link.textContent = topLevelMenu;
        
        if (hasSubMenus) {
            link.setAttribute('data-bs-toggle', 'collapse');
            link.setAttribute('aria-expanded', 'false');
            link.setAttribute('aria-controls', `collapse${index}`);
            
            const arrow = document.createElement('i');
            arrow.classList.add('bi', 'bi-chevron-down');
            link.appendChild(arrow);
        } else {
            link.target = "_blank"; // 새 창에서 열기
        }

        topLevelMenuItem.appendChild(link);
        navList.appendChild(topLevelMenuItem);

        if (hasSubMenus) {
            const subMenuItems = createSubMenuItems(subMenus, index);
            navList.appendChild(subMenuItems);
        }

        index++;
    });
}
    
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

    subMenus.forEach(function({ subMenu, url }) {
        if (subMenu.trim() === "") return; // 서브메뉴가 없으면 추가하지 않음

        const subMenuItem = document.createElement('li');
        subMenuItem.classList.add('menu-item');

        const link = document.createElement('a');
        link.href = url;
        link.textContent = subMenu;
        link.target = "_blank"; // 새 창에서 열기
        link.style.textDecoration = "none";
        link.style.color = "inherit";

        subMenuItem.appendChild(link);
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