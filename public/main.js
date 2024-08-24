document.addEventListener("DOMContentLoaded", function () {
    if (typeof gapi !== 'undefined') {
        gapi.load('client', initClient);
    } else {
        console.error('Google API not loaded');
    }

    // 세션 유지
    fetch('/get-user', { credentials: 'include' })
        .then(response => response.json())
        .then(data => {
            document.getElementById("userEmail").innerText = data.email || "로그인 정보 미확인";
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            document.getElementById("userEmail").innerText = "로그인 정보 미확인";
        });

    document.getElementById('runCodeBtn').addEventListener('click', function () {
        const code = document.getElementById('ide').value;
        runPythonCode(code);
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
    const range = 'menulist!A2:D';  // 'menulist' 시트의 A2:D 열까지

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
    navList.innerHTML = '';  // 기존 메뉴 초기화

    const menuMap = new Map();

    data.forEach(row => {
        const list1 = row[0];
        const list2 = row[1];
        const url = row[2];
        const examInfo = row[3];

        if (!menuMap.has(list1)) {
            menuMap.set(list1, new Map());
        }

        const subMenuMap = menuMap.get(list1);
        if (!subMenuMap.has(examInfo)) {
            subMenuMap.set(examInfo, []);
        }

        subMenuMap.get(examInfo).push({ list2, url });
    });

    menuMap.forEach((subMenuMap, list1) => {
        const list1Item = document.createElement('li');
        list1Item.textContent = list1;
        list1Item.classList.add('menu-item');
        list1Item.classList.add('has-sub-menu');

        const subMenuItems = document.createElement('ul');
        subMenuItems.className = 'sub-menu';

        subMenuMap.forEach((subMenus, examInfo) => {
            const examItem = document.createElement('li');
            examItem.textContent = examInfo;
            examItem.classList.add('menu-item');
            examItem.classList.add('has-sub-menu');

            const innerSubMenuItems = document.createElement('ul');
            innerSubMenuItems.className = 'sub-menu';

            subMenus.forEach(subMenuData => {
                const subMenuItem = document.createElement('li');
                subMenuItem.textContent = subMenuData.list2;
                subMenuItem.classList.add('menu-item');

                subMenuItem.addEventListener('click', function () {
                    loadExam(subMenuData.url, examInfo);
                });

                innerSubMenuItems.appendChild(subMenuItem);
            });

            examItem.appendChild(innerSubMenuItems);
            subMenuItems.appendChild(examItem);
        });

        list1Item.appendChild(subMenuItems);
        navList.appendChild(list1Item);
    });
}

function loadExam(url, examInfo) {
    const range = `문항정보!A2:D`;  // '문항정보' 시트의 A2:D 열까지
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        const data = response.result.values;
        const problemData = data.filter(row => row[1] === examInfo);
        renderProblemNavigation(problemData.length, 1, examInfo);
        loadProblem(problemData[0][0], 1, problemData);
    }).catch(error => {
        console.error('Error loading exam data:', error);
    });
}

function renderProblemNavigation(numProblems, currentProblem, examInfo) {
    const navContainer = document.getElementById('problem-navigation');
    navContainer.innerHTML = '';

    for (let i = 1; i <= numProblems; i++) {
        const problemBtn = document.createElement('span');
        problemBtn.textContent = i;
        if (i === currentProblem) {
            problemBtn.classList.add('active');
        }
        problemBtn.addEventListener('click', function () {
            loadProblem(null, i, null, examInfo);
        });
        navContainer.appendChild(problemBtn);
    }
}

function loadProblem(url, problemNumber, problemData, examInfo) {
    const iframeContent = document.getElementById('iframeContent');
    if (!url && problemData) {
        url = problemData[problemNumber - 1][0];
    }

    iframeContent.src = url;

    renderProblemNavigation(problemData.length, problemNumber, examInfo);
}

function runPythonCode(code) {
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
}
