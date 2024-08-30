
// 기본 URL 설정
const baseUrl = 'https://educodingnplaycontents.s3.amazonaws.com/';

document.addEventListener("DOMContentLoaded", function() {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', initClient);
    } else {
        console.error('Google API not loaded');
    }
    
    const runCodeBtn = document.getElementById('runCodeBtn');
    const userNameElement = document.getElementById('userName');

    // 세션 유지
    if (userNameElement) {
        fetch('/get-user', { credentials: 'include' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            userNameElement.innerText = data.username || "로그인 정보 미확인";
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            userNameElement.innerText = "로그인 정보 미확인";
        });
    }
    
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', function() {
            const code = document.getElementById('ide').value;

            fetch('/run-python', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            })
            .then(response => response.json())
            .then(data => {
                const outputElement = document.getElementById('output');
                if (outputElement) {
                    if (data.error) {
                        outputElement.innerText = `Error: ${data.error}`;
                    } else {
                        outputElement.innerText = data.output;
                    }
                }
            })
            .catch(error => console.error('Error:', error));
        });
    }
});

function initClient() {
    gapi.client.init({
        apiKey: 'AIzaSyAZqp7wFA6uQtlyalJMayyNffqhj1rVgLk',  // 실제 API 키로 교체
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        loadMenuData();
    }).catch(error => console.error('Error initializing Google API client', error));
}

function loadMenuData() {
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';
    const range = 'menulist!A2:C';

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        const data = response.result.values;
        if (data) {
            renderMenu(data);
        }
    }).catch(error => {
        console.error('Error loading menu data:', error);
    });
}

function renderMenu(data) {
    const navList = document.getElementById('navList');
    if (!navList) {
        console.error('Navigation list element not found');
        return;
    }

    const topLevelMenus = new Map();
    data.forEach(function(row) {
        const topLevelMenu = row[0];
        const subMenu = row[1];
        const examName = row[2];

        if (!topLevelMenus.has(topLevelMenu)) {
            topLevelMenus.set(topLevelMenu, []);
        }

        topLevelMenus.get(topLevelMenu).push({ subMenu, examName });
    });

    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = document.createElement('li');
        topLevelMenuItem.textContent = topLevelMenu;
        topLevelMenuItem.classList.add('menu-item', 'has-sub-menu');

        const arrow = document.createElement('span');
        arrow.classList.add('arrow', 'arrow-down');
        topLevelMenuItem.appendChild(arrow);

        topLevelMenuItem.addEventListener('click', function() {
            toggleSubMenu(topLevelMenuItem);
        });

        const subMenuItems = document.createElement('ul');
        subMenuItems.className = 'sub-menu';
        topLevelMenuItem.appendChild(subMenuItems);

        subMenus.forEach(function(subMenuData) {
            const subMenuItem = document.createElement('li');
            subMenuItem.classList.add('menu-item');

            const icon = document.createElement('i');
            icon.classList.add('bi', 'bi-file-text');
            subMenuItem.appendChild(icon);

            const text = document.createElement('span');
            text.textContent = subMenuData.subMenu;
            subMenuItem.appendChild(text);

            subMenuItem.addEventListener('click', function(event) {
                event.stopPropagation();
                onMenuSelect(subMenuData.examName);
                applySubMenuHighlight(subMenuItem);
            });

            subMenuItems.appendChild(subMenuItem);
        });

        navList.appendChild(topLevelMenuItem);
    });

    // 초기 로드 시 첫 번째 메뉴 선택 및 문제 로드
    if (data.length > 0) {
        const firstMenu = data[0][2];  // 첫 번째 시험지명
        onMenuSelect(firstMenu);
    }
}

function toggleSubMenu(topLevelMenuItem) {
    const subMenu = topLevelMenuItem.querySelector('.sub-menu');
    const arrow = topLevelMenuItem.querySelector('.arrow');

    const allSubMenuItems = document.querySelectorAll('.sub-menu');
    const allArrows = document.querySelectorAll('.arrow');

    allSubMenuItems.forEach(function(item) {
        if (item !== subMenu) {
            item.style.maxHeight = '0px';
            item.style.display = 'none';
        }
    });

    allArrows.forEach(function(item) {
        if (item !== arrow) {
            toggleArrow(item, false);
        }
    });

    if (subMenu.style.maxHeight === '0px' || !subMenu.style.maxHeight) {
        subMenu.style.maxHeight = '1000px';
        subMenu.style.display = 'block';
        toggleArrow(arrow, true);
    } else {
        subMenu.style.maxHeight = '0px';
        subMenu.style.display = 'none';
        toggleArrow(arrow, false);
    }
}

function toggleArrow(arrow, isOpen) {
    if (isOpen) {
        arrow.className = 'arrow arrow-up';
    } else {
        arrow.className = 'arrow arrow-down';
    }
}

// applySubMenuHighlight 함수 추가
function applySubMenuHighlight(selectedItem) {
    const allSubMenuItems = document.querySelectorAll('.sub-menu .menu-item');
    allSubMenuItems.forEach(item => item.classList.remove('active'));
    selectedItem.classList.add('active');
}

function onMenuSelect(examName) {
    loadProblem(1, examName);  // 1번 문항을 기본 로드
    renderProblemNavigation(10, 1, examName);  // 10문항 네비게이션 생성
}

function loadProblem(problemNumber, examName) {
    const problemFileName = `${examName}_p${problemNumber.toString().padStart(2, '0')}.html`;
    const problemUrl = `${baseUrl}${problemFileName}`;
    const iframe = document.getElementById('iframeContent');

    // 문제 타이틀 설정
    const problemTitle = `${examName} - 문제 ${problemNumber}`;
    const problemTitleElement = document.getElementById('problem-title');
    if (problemTitleElement) {
        problemTitleElement.textContent = problemTitle;
    }

    if (iframe) {
        fetch(problemUrl, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    iframe.src = problemUrl;
                } else {
                    console.error('문제 URL을 찾을 수 없습니다.');
                }
            })
            .catch(error => {
                console.error('문제 정보를 불러오는 중 오류 발생:', error);
            });
    }
}

function renderProblemNavigation(numProblems, currentProblem) {
    const navContainer = document.getElementById('problem-navigation');
    navContainer.innerHTML = ''; // 기존 내용 초기화

    for (let i = 1; i <= numProblems; i++) {
        const problemBtn = document.createElement('span');
        problemBtn.classList.add('problem-icon');
        
        const icon = document.createElement('i');
        icon.classList.add('bi', i === currentProblem ? `bi-${i}-circle-fill` : `bi-${i}-circle`);
        
        problemBtn.appendChild(icon);
        
        problemBtn.addEventListener('click', function() {
            updateProblemNavigation(i);
            // 여기에 문제 로드 로직 추가 (예: loadProblem(i))
        });

        navContainer.appendChild(problemBtn);
    }
}

function updateProblemNavigation(selectedProblem) {
    const icons = document.querySelectorAll('#problem-navigation .problem-icon i');
    icons.forEach((icon, index) => {
        const problemNumber = index + 1;
        icon.className = `bi ${problemNumber === selectedProblem ? `bi-${problemNumber}-circle-fill` : `bi-${problemNumber}-circle`}`;
    });
}

// 문제 로드
document.addEventListener('DOMContentLoaded', function() {
    const examNameElement = document.getElementById('examName');
    if (examNameElement) {
        const initialExamName = examNameElement.textContent.trim();
        loadProblem(1, initialExamName);
        renderProblemNavigation(10, 1, initialExamName);
    }
});