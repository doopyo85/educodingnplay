let currentProblemNumber = 1;
const totalProblems = 10;
let currentExamName = '';
let problemData = [];

document.addEventListener("DOMContentLoaded", function() {
    
    // Google API 키와 스프레드시트 ID를 서버에서 전달받아 사용
    const googleApiKey = document.getElementById('googleApiKey').value;
    const spreadsheetId = document.getElementById('spreadsheetId').value;
    
    if (typeof gapi !== 'undefined') {
        gapi.load('client', initClient);
    } else {
        console.error('Google API not loaded');
    }
    
    setupEventListeners();
});

function setupEventListeners() {
    const runCodeBtn = document.getElementById('runCodeBtn');
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', runCode);
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
}

function runCode() {
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
            outputElement.innerText = data.error ? `Error: ${data.error}` : data.output;
        }
    })
    .catch(error => console.error('Error:', error));
}

function initClient() {
    gapi.client.init({
      apiKey: googleApiKey,
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
      loadMenuData();
      loadProblemData();
    }).catch(error => console.error('Error initializing Google API client', error));
  }
  
function loadMenuData() {
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'menulist!A2:C',
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
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: '문항정보!A:C',
    }).then((response) => {
      problemData = response.result.values;
      console.log('Problem data loaded:', problemData);
      
      if (problemData && problemData.length > 0) {
        loadProblem(currentProblemNumber);
      } else {
        console.error('No problem data loaded');
      }
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
        const [topLevelMenu, subMenu, examName] = row;
        if (!topLevelMenus.has(topLevelMenu)) {
            topLevelMenus.set(topLevelMenu, []);
        }
        topLevelMenus.get(topLevelMenu).push({ subMenu, examName });
    });

    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu);
        const subMenuItems = createSubMenuItems(subMenus);
        topLevelMenuItem.appendChild(subMenuItems);
        navList.appendChild(topLevelMenuItem);
    });

    if (data.length > 0) {
        onMenuSelect(data[0][2]);
    }
}

function createTopLevelMenuItem(topLevelMenu) {
    const topLevelMenuItem = document.createElement('li');
    topLevelMenuItem.textContent = topLevelMenu;
    topLevelMenuItem.classList.add('menu-item', 'has-sub-menu');

    const arrow = document.createElement('span');
    arrow.classList.add('arrow', 'arrow-down');
    topLevelMenuItem.appendChild(arrow);

    topLevelMenuItem.addEventListener('click', () => toggleSubMenu(topLevelMenuItem));

    return topLevelMenuItem;
}

function createSubMenuItems(subMenus) {
    const subMenuItems = document.createElement('ul');
    subMenuItems.className = 'sub-menu';

    subMenus.forEach(function({ subMenu, examName }) {
        const subMenuItem = document.createElement('li');
        subMenuItem.classList.add('menu-item');

        const icon = document.createElement('i');
        icon.classList.add('bi', 'bi-file-text');
        subMenuItem.appendChild(icon);

        const text = document.createElement('span');
        text.textContent = subMenu;
        subMenuItem.appendChild(text);

        subMenuItem.addEventListener('click', function(event) {
            event.stopPropagation();
            onMenuSelect(examName);
            applySubMenuHighlight(subMenuItem);
        });

        subMenuItems.appendChild(subMenuItem);
    });

    return subMenuItems;
}

function toggleSubMenu(topLevelMenuItem) {
    const subMenu = topLevelMenuItem.querySelector('.sub-menu');
    const arrow = topLevelMenuItem.querySelector('.arrow');

    document.querySelectorAll('.sub-menu').forEach(item => {
        if (item !== subMenu) {
            item.style.maxHeight = '0px';
            item.style.display = 'none';
        }
    });

    document.querySelectorAll('.arrow').forEach(item => {
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
    arrow.className = `arrow arrow-${isOpen ? 'up' : 'down'}`;
}

function applySubMenuHighlight(selectedItem) {
    document.querySelectorAll('.sub-menu .menu-item').forEach(item => item.classList.remove('active'));
    selectedItem.classList.add('active');
}

function onMenuSelect(examName) {
    currentExamName = examName;
    currentProblemNumber = 1;
    console.log('Selected exam:', currentExamName);
    loadProblem(currentProblemNumber);
    renderProblemNavigation();
}

function renderProblemNavigation() {
    const navContainer = document.getElementById('problem-navigation');
    if (!navContainer) return;

    navContainer.innerHTML = '';

    for (let i = 1; i <= totalProblems; i++) {
        const problemBtn = document.createElement('span');
        problemBtn.classList.add('problem-icon');
        
        const icon = document.createElement('i');
        icon.classList.add('bi', i === currentProblemNumber ? `bi-${i === 10 ? 0 : i}-circle-fill` : `bi-${i === 10 ? 0 : i}-circle`);
        
        problemBtn.appendChild(icon);
        
        problemBtn.addEventListener('click', () => navigateToProblem(i));

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
    console.log('Loading problem:', currentExamName, problemNumber);
    
    if (!problemData || problemData.length === 0) {
        console.error('Problem data is not loaded yet');
        return;
    }

    const problemInfo = problemData.find(problem => problem[1] === `${currentExamName}_p${problemNumber.toString().padStart(2, '0')}`);
    if (problemInfo) {
        const [problemFileName] = problemInfo;
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

