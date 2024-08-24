document.addEventListener("DOMContentLoaded", function() {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', initClient);
    } else {
        console.error('Google API not loaded');
    }
    fetch('/test')
        .then(response => response.text())
        .then(data => {
            document.getElementById('dynamic-content').innerHTML = data;
        })
        .catch(error => console.error('Error loading dynamic content:', error));

    // 세션 유지
    fetch('/get-user', { credentials: 'include' })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("userEmail").innerText = data.email || "로그인 정보 미확인";
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        document.getElementById("userEmail").innerText = "로그인 정보 미확인";
    });
    
    document.getElementById('runCodeBtn').addEventListener('click', function() {
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
            if (data.error) {
                document.getElementById('output').innerText = `Error: ${data.error}`;
            } else {
                document.getElementById('output').innerText = data.output;
            }
        })
        .catch(error => console.error('Error:', error));
    });

});

function initClient() {
    gapi.client.init({
        apiKey: 'AIzaSyAZqp7wFA6uQtlyalJMayyNffqhj1rVgLk',
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        loadMenuData();
    }).catch(error => console.error('Error initializing Google API client', error));
}

function loadMenuData() {
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';
    const range = 'A2:e';

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        console.log('Response from Google Sheets:', response);
        const data = response.result.values;
        if (data) {
            const navList = document.getElementById('navList');
            const contentView = document.getElementById('iframeContent');

            const topLevelMenus = new Map();
            data.forEach(function(row) {
                const topLevelMenu = row[0];
                const subMenu = row[1];
                const url = row[2];

                if (!topLevelMenus.has(topLevelMenu)) {
                    topLevelMenus.set(topLevelMenu, []);
                }

                topLevelMenus.get(topLevelMenu).push({ subMenu, url });
            });

            topLevelMenus.forEach(function(subMenus, topLevelMenu) {
                const topLevelMenuItem = document.createElement('li');
                topLevelMenuItem.textContent = topLevelMenu;
                topLevelMenuItem.classList.add('menu-item');
                topLevelMenuItem.classList.add('has-sub-menu');

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
                        showPageContent(subMenuData.url, contentView);
                        applySubMenuHighlight(subMenuItem);
                    });

                    subMenuItems.appendChild(subMenuItem);
                });

                navList.appendChild(topLevelMenuItem);
            });
        }
    }).catch(error => {
        console.error('Error loading menu data:', error);
    });
}

// toggleSubMenu 함수는 메뉴를 클릭했을 때 서브 메뉴를 토글하는 함수입니다.

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

// showPageContent 함수는 iframeContent 요소에 주어진 URL을 로드하는 함수입니다.

function showPageContent(url, examName) {
    const contentView = document.getElementById('iframeContent');
    contentView.src = url;

    // 문제 네비게이션 생성
    renderProblemNavigation(10, 1, examName);
}
function applySubMenuHighlight(selectedSubMenu) {
    const allSubMenus = document.querySelectorAll('.sub-menu li');
    allSubMenus.forEach(function(item) {
        item.classList.remove('selected-item');
    });

    selectedSubMenu.classList.add('selected-item');
}

function renderProblemNavigation(numProblems, currentProblem, examName) {
    const navContainer = document.getElementById('problem-navigation');
    navContainer.innerHTML = '';

    for (let i = 1; i <= numProblems; i++) {
        const problemBtn = document.createElement('span');
        problemBtn.textContent = i;
        if (i === currentProblem) {
            problemBtn.classList.add('active');
        }
        problemBtn.addEventListener('click', function () {
            loadProblem(i, examName);
        });
        navContainer.appendChild(problemBtn);
    }
}

function loadProblem(problemNumber, examName) {
    // 문제 URL을 동적으로 생성
    const problemUrl = `https://educodingnplaycontents.s3.amazonaws.com/${examName}_p${problemNumber.toString().padStart(2, '0')}.html`;
    
    // 문제를 표시할 iframe의 src를 설정
    const iframe = document.getElementById('iframeContent');
    
    // 문제 URL이 유효한지 확인 후 iframe에 로드
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

// 문제 번호 버튼 클릭 시 호출되는 함수
document.querySelectorAll('.problem-number').forEach(button => {
    button.addEventListener('click', () => {
        const problemNumber = button.textContent.trim();
        const examName = document.getElementById('examName').textContent.trim(); // 시험 이름은 미리 설정된 곳에서 가져옴
        loadProblem(problemNumber, examName);
    });
});

// 초기 로드 시 1번 문제를 자동으로 로드
const initialExamName = document.getElementById('examName').textContent.trim();
loadProblem(1, initialExamName);



function applySubMenuHighlight(selectedSubMenu) {
    const allSubMenus = document.querySelectorAll('.sub-menu li');
    allSubMenus.forEach(function (item) {
        item.classList.remove('selected-item');
    });

    selectedSubMenu.classList.add('selected-item');
}


// ---여기부터는 중복인거 같은데----------------------------------------------------------------------
function loadQuestionData() {
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';
    const range = '문항정보!A2:D';  // 문항정보 시트의 A2:D 열까지

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        const data = response.result.values;
        if (data) {
            const navList = document.getElementById('navList');
            const contentView = document.getElementById('iframeContent');
            const questionsMap = new Map();

            data.forEach(function(row) {
                const examName = row[0];
                const questionNumber = row[1];
                const inputData = row[2];
                const expectedOutput = row[3];

                if (!questionsMap.has(examName)) {
                    questionsMap.set(examName, []);
                }

                questionsMap.get(examName).push({
                    questionNumber,
                    inputData,
                    expectedOutput,
                    url: `https://educodingnplaycontents.s3.amazonaws.com/${examName}_${questionNumber}.html`
                });
            });

            renderQuestions(questionsMap);
        }
    }).catch(error => {
        console.error('Error loading question data:', error);
    });
}

function renderQuestions(questionsMap) {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';  // 기존 메뉴 초기화
    questionsMap.forEach((questions, examName) => {
        const examItem = document.createElement('li');
        examItem.textContent = examName;
        examItem.classList.add('menu-item');
        examItem.classList.add('has-sub-menu');

        const subMenuItems = document.createElement('ul');
        subMenuItems.className = 'sub-menu';
        examItem.appendChild(subMenuItems);

        questions.forEach(questionData => {
            const subMenuItem = document.createElement('li');
            subMenuItem.classList.add('menu-item');
            subMenuItem.textContent = questionData.questionNumber;

            subMenuItem.addEventListener('click', function() {
                loadQuestionContent(questionData);
            });

            subMenuItems.appendChild(subMenuItem);
        });

        navList.appendChild(examItem);
    });
}

function loadQuestionContent(questionData) {
    const iframeContent = document.getElementById('iframeContent');
    iframeContent.src = questionData.url;

    document.getElementById('runCodeBtn').onclick = function() {
        const userCode = document.getElementById('ide').value;
        evaluateUserCode(userCode, questionData.inputData, questionData.expectedOutput);
    };
}

// ---여기까지 중복인거 같은데----------------------------------------------------------------------

function evaluateUserCode(userCode, inputData, expectedOutput) {
    // 실제로 코드를 실행하여 결과를 비교하는 로직
    const exec = new Function(userCode);
    let userOutput;
    try {
        userOutput = exec(inputData);
    } catch (error) {
        userOutput = `Error: ${error.message}`;
    }

    const result = (userOutput === expectedOutput) ? '정답입니다!' : '오답입니다.';
    document.getElementById('output').textContent = `결과: ${userOutput}\n${result}`;
}

