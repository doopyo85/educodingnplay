// 모듈 패턴을 사용하여 전역 네임스페이스 오염 방지
const ExamApp = (function() {
    // 비공개 변수
    let currentProblemNumber = 1;
    let totalProblems = 0;
    let currentExamName = '';
    let problemData = [];

    // 설정 객체
    const config = {
        apiKey: '',
        spreadsheetId: ''
    };

    // DOM 요소 캐싱
    const elements = {
        navList: document.getElementById('navList'),
        iframeContent: document.getElementById('iframeContent'),
        problemTitle: document.getElementById('problem-title'),
        problemNavigation: document.getElementById('problem-navigation'),
        prevButton: document.getElementById('prev-problem'),
        nextButton: document.getElementById('next-problem')
    };

    // 초기화 함수
    function init() {
        document.addEventListener("DOMContentLoaded", function() {
            if (!window.menuLoaded) {
                const apiKeyElement = document.getElementById('googleApiKey');
                const spreadsheetIdElement = document.getElementById('spreadsheetId');

                if (apiKeyElement && spreadsheetIdElement) {
                    config.apiKey = apiKeyElement.value;
                    config.spreadsheetId = spreadsheetIdElement.value;

                    if (typeof gapi !== 'undefined') {
                        gapi.load('client', initClient);
                    } else {
                        showError('Google API not loaded');
                    }
                } else {
                    showError('Required elements not found');
                }

                window.menuLoaded = true;
            }
            setupEventListeners();
        });

        window.addEventListener('resize', function() {
            if (elements.iframeContent) {
                resizeIframe(elements.iframeContent);
            }
        });
    }

    // 비동기 데이터 로딩을 위한 프로미스 기반 함수
    function loadData(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .catch(error => {
                showError(`Error loading data: ${error.message}`);
                throw error;
            });
    }

    // Google API 클라이언트 초기화
    function initClient() {
        gapi.client.init({
            apiKey: config.apiKey,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        }).then(() => {
            console.log('Google API client initialized');
            return Promise.all([
                loadData('/api/get-menu-data'),
                loadData('/api/get-problem-data')
            ]);
        }).then(([menuData, loadedProblemData]) => {
            if (menuData && menuData.length > 0) {
                renderMenu(menuData);
            } else {
                throw new Error('No menu data loaded');
            }

            if (loadedProblemData && loadedProblemData.length > 0) {
                problemData = loadedProblemData;
                console.log('Problem data loaded successfully');
            } else {
                throw new Error('No problem data loaded');
            }
        }).catch(error => {
            showError(`Error in initialization process: ${error.message}`);
        });
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        const runCodeBtn = document.getElementById('runCodeBtn');
        if (runCodeBtn) {
            runCodeBtn.addEventListener('click', runCode);
        }

        if (elements.prevButton) {
            elements.prevButton.addEventListener('click', navigateToPrevProblem);
        }

        if (elements.nextButton) {
            elements.nextButton.addEventListener('click', navigateToNextProblem);
        }

        fetchUserData();
    }

    // 코드 실행
    function runCode() {
        var editor = ace.edit("editor");
        const code = editor.getValue();
        document.getElementById('output-content').innerText = `Running code:\n${code}`;
    }

    // 이전 문제로 이동
    function navigateToPrevProblem() {
        if (currentProblemNumber > 1) {
            navigateToProblem(currentProblemNumber - 1);
        }
    }

    // 다음 문제로 이동
    function navigateToNextProblem() {
        if (currentProblemNumber < totalProblems) {
            navigateToProblem(currentProblemNumber + 1);
        }
    }

    // 사용자 데이터 가져오기
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

    // 메뉴 렌더링
    function renderMenu(data) {
        if (!elements.navList) {
            showError('Navigation list element not found');
            return;
        }

        elements.navList.innerHTML = '';

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

        topLevelMenus.forEach((subMenus, topLevelMenu, index) => {
            const topLevelMenuItem = createTopLevelMenuItem(topLevelMenu, index);
            const subMenuItems = createSubMenuItems(subMenus, index);
            elements.navList.appendChild(topLevelMenuItem);
            elements.navList.appendChild(subMenuItems);
        });

        initializeCollapseListeners();
    }

    // 상위 메뉴 아이템 생성
    function createTopLevelMenuItem(topLevelMenu, index) {
        const topLevelMenuItem = document.createElement('li');
        topLevelMenuItem.classList.add('menu-item');

        const link = document.createElement('a');
        link.href = `#collapse-${index}`;
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

        link.addEventListener('click', function() {
            arrow.classList.toggle('rotate');
        });

        return topLevelMenuItem;
    }

    // 하위 메뉴 아이템 생성
    function createSubMenuItems(subMenus, index) {
        const subMenuContainer = document.createElement('div');
        subMenuContainer.id = `collapse-${index}`;
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

    // Bootstrap collapse 리스너 초기화
    function initializeCollapseListeners() {
        const collapseElementList = [].slice.call(document.querySelectorAll('.collapse'))
        collapseElementList.forEach(function(collapseEl) {
            new bootstrap.Collapse(collapseEl, {
                toggle: false
            });
        });

        document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(function(el) {
            el.addEventListener('click', function(event) {
                event.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                const bsCollapse = bootstrap.Collapse.getInstance(target);
                if (bsCollapse) {
                    if (target.classList.contains('show')) {
                        bsCollapse.hide();
                    } else {
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
    }

    // 토글 아이콘 업데이트
    function updateToggleIcon(element) {
        const icon = element.querySelector('.bi');
        if (icon) {
            icon.classList.toggle('bi-chevron-down');
            icon.classList.toggle('bi-chevron-up');
        }
    }

    // 메뉴 선택 시 동작
    function onMenuSelect(examName) {
        currentExamName = examName;
        currentProblemNumber = 1;
        console.log('Selected exam:', currentExamName);
        
        if (problemData && problemData.length > 0) {
            totalProblems = problemData.filter(problem => 
                problem[1].toLowerCase() === currentExamName.toLowerCase()
            ).length;

            loadProblem(currentProblemNumber);
            renderProblemNavigation();

            const navContainer = document.getElementById('problem-navigation-container');
            if (navContainer) {
                navContainer.style.display = 'flex';
            }

            const selectedMenuItem = Array.from(document.querySelectorAll('.nav-container .menu-item, .nav-container .sub-menu .menu-item'))
                .find(item => item.textContent.trim() === examName);
            if (selectedMenuItem) {
                applySubMenuHighlight(selectedMenuItem);
            }
        } else {
            showError('Problem data not loaded yet. Cannot load problem.');
        }
    }

    // 문제 네비게이션 렌더링
    function renderProblemNavigation() {
        if (!elements.problemNavigation) return;

        elements.problemNavigation.innerHTML = '';

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

            elements.problemNavigation.appendChild(problemBtn);
        }

        updateNavigationButtons();
    }

    // 특정 문제로 이동
    function navigateToProblem(problemNumber) {
        currentProblemNumber = problemNumber;
        updateProblemNavigation();
        loadProblem(currentProblemNumber);
    }

    // 문제 네비게이션 업데이트
    function updateProblemNavigation() {
        const icons = document.querySelectorAll('#problem-navigation .problem-icon');
        
        icons.forEach((icon, index) => {
            const problemNumber = index + 1;
            icon.className = `bi problem-icon ${problemNumber === currentProblemNumber ? `bi-${problemNumber === 10 ? 0 : problemNumber}-circle-fill` : `bi-${problemNumber === 10 ? 0 : problemNumber}-circle`}`;
        });
        
        updateNavigationButtons();
    }

    // 네비게이션 버튼 업데이트
    function updateNavigationButtons() {
        if (elements.prevButton) elements.prevButton.disabled = currentProblemNumber <= 1;
        if (elements.nextButton) elements.nextButton.disabled = currentProblemNumber >= totalProblems;
    }

    // iframe 크기 조정
    function resizeIframe(iframe) {
        if (!iframe) return;

        const container = document.getElementById('problem-container');
        if (!container) return;

        const containerHeight = container.clientHeight;
        iframe.style.height = containerHeight + 'px';

        iframe.onload = function() {
            iframe.style.height = containerHeight + 'px';
        };
    }

    // 문제 로드
    function loadProblem(problemNumber) {
        console.log('Loading problem:', currentExamName, problemNumber);
        
        if (!problemData || problemData.length === 0) {
            showError('Problem data is not loaded yet');
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

            if (elements.iframeContent) {
                fetch(problemUrl)
                    .then(response => response.text())
                    .then(html => {
                        const modifiedHtml = `
                            <html>
                                <head>
                                <base target="_parent">
                                <link rel="stylesheet" href="/resource/contents.css">
                                <style>
                                    body { font-family: Arial, sans-serif; }
                                </style>
                            </head>
                            <body>
                                ${html}
                            </body>
                        </html>
        `;
        elements.iframeContent.srcdoc = modifiedHtml;
    })
    .catch(error => {
        console.error('Error loading problem:', error);
        elements.iframeContent.srcdoc = '<p>Error loading problem content.</p>';
    });

    elements.iframeContent.onload = function() {
        resizeIframe(elements.iframeContent);
    };
} else {
    showError('iframe element not found');
}

// 앞의 세 글자만 대문자로 변환
const examNameModified = currentExamName.substring(0, 3).toUpperCase() + currentExamName.substring(3);
const problemTitle = `${examNameModified} - 문제 ${problemNumber}`;
if (elements.problemTitle) {
    elements.problemTitle.textContent = problemTitle;
} else {
    showError('problem-title element not found');
}

// Update the Vue component with the new problem
if (typeof window.updateEditorProblem === 'function') {
    window.updateEditorProblem({
        title: problemTitle,
        url: problemUrl,
        // Add any other relevant problem data here
    });
}
        } else {
            showError(`문제 정보를 찾을 수 없습니다: ${currentExamName}, ${problemNumber}`);
            console.log('Available problems:', problemData.map(p => `${p[1]} ${p[2]}`));
        }
    }

    // 하위 메뉴 하이라이트 적용
    function applySubMenuHighlight(selectedItem) {
        document.querySelectorAll('.nav-container .menu-item, .nav-container .sub-menu .menu-item').forEach(item => item.classList.remove('active'));
        selectedItem.classList.add('active');
        let parentCollapse = selectedItem.closest('.collapse');
        if (parentCollapse) {
            let parentMenuItem = document.querySelector(`[href="#${parentCollapse.id}"]`).closest('.menu-item');
            parentMenuItem.classList.remove('active');
        }
    }

    // 오류 표시
    function showError(message) {
        console.error(message);
        // TODO: 사용자에게 오류 메시지를 표시하는 UI 요소 추가
    }

    // 공개 메서드
    return {
        init: init,
        loadProblem: loadProblem,
        navigateToProblem: navigateToProblem
    };
})();

// 애플리케이션 초기화
ExamApp.init();