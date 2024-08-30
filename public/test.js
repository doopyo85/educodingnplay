// baseUrl 선언 제거 (이미 다른 곳에서 선언되어 있다면 이 줄을 주석 처리하거나 제거하세요)
// const baseUrl = 'https://educodingnplaycontents.s3.amazonaws.com/';

let currentProblemNumber = 1;
const totalProblems = 10;
let currentExamName = '';
let problemData = [];

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
    
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (currentProblemNumber > 1) {
                navigateToProblem(currentProblemNumber - 1);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentProblemNumber < totalProblems) {
                navigateToProblem(currentProblemNumber + 1);
            }
        });
    }
});

function initClient() {
    gapi.client.init({
        apiKey: 'AIzaSyAZqp7wFA6uQtlyalJMayyNffqhj1rVgLk',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        loadMenuData();
        loadProblemData();
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

function loadProblemData() {
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';
    const range = '문항정보!A:C';

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        problemData = response.result.values;
        console.log('Problem data loaded:', problemData);  // 디버깅을 위한 로그 추가
    }).catch(error => {
        console.error('Error loading problem data:', error);
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

function applySubMenuHighlight(selectedItem) {
    const allSubMenuItems = document.querySelectorAll('.sub-menu .menu-item');
    allSubMenuItems.forEach(item => item.classList.remove('active'));
    selectedItem.classList.add('active');
}

function onMenuSelect(examName) {
    currentExamName = examName;
    currentProblemNumber = 1;
    console.log('Selected exam:', currentExamName);  // 디버깅을 위한 로그 추가
    loadProblem(currentProblemNumber);
    renderProblemNavigation();
}

function renderProblemNavigation() {
    const navContainer = document.getElementById('problem-navigation');
    navContainer.innerHTML = '';

    for (let i = 1; i <= totalProblems; i++) {
        const problemBtn = document.createElement('span');
        problemBtn.classList.add('problem-icon');
        
        const icon = document.createElement('i');
        icon.classList.add('bi', i === currentProblemNumber ? `bi-${i === 10 ? 0 : i}-circle-fill` : `bi-${i === 10 ? 0 : i}-circle`);
        
        problemBtn.appendChild(icon);
        
        problemBtn.addEventListener('click', function() {
            navigateToProblem(i);
        });

        navContainer.appendChild(problemBtn);
    }

    updateNavigationButtons();
}

function navigateToProblem(problemNumber) {
    currentProblemNumber = problemNumber;
    updateProblemNavigation();
    loadProblem(currentProblemNumber);
}

function updateProblemNavigation() {
    const icons = document.querySelectorAll('#problem-navigation .problem-icon i');
    icons.forEach((icon, index) => {
        const problemNumber = index + 1;
        icon.className = `bi ${problemNumber === currentProblemNumber ? `bi-${problemNumber === 10 ? 0 : problemNumber}-circle-fill` : `bi-${problemNumber === 10 ? 0 : problemNumber}-circle`}`;
    });
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    if (prevButton) prevButton.style.visibility = currentProblemNumber > 1 ? 'visible' : 'hidden';
    if (nextButton) nextButton.style.visibility = currentProblemNumber < totalProblems ? 'visible' : 'hidden';
}

function loadProblem(problemNumber) {
    console.log('Loading problem:', currentExamName, problemNumber);  // 디버깅을 위한 로그 추가
    console.log('Problem data:', problemData);  // 디버깅을 위한 로그 추가
    
    const problemInfo = problemData.find(problem => problem[1] === `${currentExamName}p${problemNumber.toString().padStart(2, '0')}`);
    if (problemInfo) {
        const problemFileName = problemInfo[0];
        const problemUrl = `https://educodingnplaycontents.s3.amazonaws.com/${problemFileName}`;
        const iframe = document.getElementById('iframeContent');

        const problemTitle = `${currentExamName} - 문제 ${problemNumber}`;
        const problemTitleElement = document.getElementById('problem-title');
        if (problemTitleElement) {
            problemTitleElement.textContent = problemTitle;
        }

        if (iframe) {
            iframe.src = problemUrl;
        }
    } else {
        console.error('문제 정보를 찾을 수 없습니다:', currentExamName, problemNumber);
    }
}