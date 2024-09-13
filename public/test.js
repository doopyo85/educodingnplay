// 전역 변수 선언을 파일 맨 위로 이동하고 모두 var로 변경
var currentProblemNumber = 1;
var totalProblems = 10;
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

function initClient() {
    const apiKey = document.getElementById('googleApiKey').value;
    const spreadsheetId = document.getElementById('spreadsheetId').value;
    
    if (!apiKey || !spreadsheetId) {
        console.error('API Key or Spreadsheet ID is missing');
        return;
    }

    gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        console.log('Google API client initialized');
        return loadMenuData(spreadsheetId);
    }).then((menuData) => {
        if (menuData && menuData.length > 0) {
            renderMenu(menuData);
            return loadProblemData(spreadsheetId);
        } else {
            throw new Error('No menu data loaded');
        }
    }).then((problemData) => {
        if (problemData && problemData.length > 0) {
            console.log('Problem data loaded successfully');
            window.problemData = problemData; // Store problem data globally
            if (currentExamName) {
                loadProblem(currentProblemNumber);
            }
        } else {
            throw new Error('No problem data loaded');
        }
    }).catch(error => {
        console.error('Error in initialization process:', error);
    });
}


function setupEventListeners() {
    console.log("Setting up event listeners"); // 추가
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
  
function loadMenuData(spreadsheetId) {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'menulist!A2:C',
    }).then((response) => {
        const data = response.result.values;
        if (data && data.length > 0) {
            return data;
        } else {
            throw new Error('No menu data found');
        }
    });
}

function loadProblemData(spreadsheetId) {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: '문항정보!A:C',
    }).then((response) => {
        const data = response.result.values;
        if (data && data.length > 0) {
            // 첫 번째 행이 헤더인 경우 제거
            if (data[0][0] === 'URL') {
                data.shift();
            }
            return data;
        } else {
            throw new Error('No problem data found');
        }
    });
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
    topLevelMenus.forEach(function(subMenus, topLevelMenu) {
        const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu, index);
        const subMenuItems = createSubMenuItems(subMenus, index);
        navList.appendChild(topLevelMenuItem);
        navList.appendChild(subMenuItems);
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

function onMenuSelect(examName) {
    currentExamName = examName;
    currentProblemNumber = 1;
    console.log('Selected exam:', currentExamName);
    
    if (problemData && problemData.length > 0) {
        loadProblem(currentProblemNumber);
        renderProblemNavigation();
    } else {
        console.error('Problem data not loaded yet. Cannot load problem.');
    }

    // 선택된 메뉴 아이템 찾기 및 하이라이트 적용
    const selectedMenuItem = Array.from(document.querySelectorAll('.nav-container .menu-item, .nav-container .sub-menu .menu-item'))
        .find(item => item.textContent.trim() === examName);
    if (selectedMenuItem) {
        applySubMenuHighlight(selectedMenuItem);
    }

}

function renderProblemNavigation() {
    const navContainer = document.getElementById('problem-navigation');
    if (!navContainer) return;

    navContainer.innerHTML = '';

    for (let i = 1; i <= totalProblems; i++) {
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
    const icons = document.querySelectorAll('#problem-navigation .problem-icon');
    
    icons.forEach((icon, index) => {
        const problemNumber = index + 1;
        icon.className = `bi problem-icon ${problemNumber === currentProblemNumber ? `bi-${problemNumber === 10 ? 0 : problemNumber}-circle-fill` : `bi-${problemNumber === 10 ? 0 : problemNumber}-circle`}`;
    });
    
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    if (prevButton) prevButton.style.visibility = currentProblemNumber > 1 ? 'visible' : 'hidden';
    if (nextButton) nextButton.style.visibility = currentProblemNumber < totalProblems ? 'visible' : 'hidden';
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


function loadProblem(problemNumber) {
    console.log('Loading problem:', currentExamName, problemNumber);
    console.log('Problem data:', problemData);
    
    if (!problemData || problemData.length === 0) {
        console.error('Problem data is not loaded yet');
        return;
    }

    const problemInfo = problemData.find(problem => 
        problem[1].toLowerCase() === currentExamName.toLowerCase() && 
        problem[2].toLowerCase() === `p${problemNumber.toString().padStart(2, '0')}`
    );

    if (problemInfo) {
        const [problemFileName, , ] = problemInfo;
        const problemUrl = `https://educodingnplaycontents.s3.amazonaws.com/${problemFileName}`;
        console.log('Problem URL:', problemUrl);

        const iframe = document.getElementById('iframeContent');
        if (iframe) {
            iframe.src = problemUrl;
            iframe.onload = function() {
                resizeIframe(iframe);
            };
            console.log('iframe src set to:', problemUrl);
        } else {
            console.error('iframe element not found');
        }

        const problemTitle = `${currentExamName} - 문제 ${problemNumber}`;
        const problemTitleElement = document.getElementById('problem-title');
        if (problemTitleElement) {
            problemTitleElement.textContent = problemTitle;
        } else {
            console.error('problem-title element not found');
        }
    } else {
        console.error('문제 정보를 찾을 수 없습니다:', currentExamName, problemNumber);
        console.log('Available problems:', problemData.map(p => `${p[1]} ${p[2]}`));
    }
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

// 여기서부터 파이썬 ide 코드----------------------------------------------
async function loadPyodideAndPackages() {
    if (typeof loadPyodide === 'undefined') {
        console.error('Pyodide가 아직 로드되지 않았습니다.');
        return;
    }

    pyodide = await loadPyodide();
    await pyodide.loadPackage("numpy");  // 필요한 패키지 로드
    console.log("Pyodide loaded");
}

// DOMContentLoaded가 완료된 후에 Pyodide를 로드
document.addEventListener("DOMContentLoaded", function() {
    loadPyodideAndPackages();
});

// 파이썬 ide 실행코드
function runCode() {
    const code = document.getElementById('ide').value;
    const outputElement = document.getElementById('output');
    
    if (!code) {
        alert('Please enter code before running.');
        return;
    }

    try {
        // Python 코드 실행
        let output = pyodide.runPython(code);
        
        // 결과가 Pyodide.ffi.PyProxy 객체인 경우 JavaScript 객체로 변환
        if (output instanceof pyodide.ffi.PyProxy) {
            output = output.toJs();
        }
        
        // 출력
        outputElement.value += '>>> ' + code + '\n' + output + '\n';
    } catch (err) {
        outputElement.value += '>>> ' + code + '\n' + err + '\n';
    }
    
    // 스크롤을 아래로 이동
    outputElement.scrollTop = outputElement.scrollHeight;
}

// 키 이벤트 리스너 추가
document.getElementById('ide').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();  // 기본 엔터 동작 방지
        runCode();
    }
});