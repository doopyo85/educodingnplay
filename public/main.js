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
        loadQuestionData();
    }).catch(error => console.error('Error initializing Google API client', error));
}

function loadQuestionData() {
    const spreadsheetId = '1yEb5m_fjw3msbBYLFtO55ukUI0C0XkJfLurWWyfALok';
    const range = '문항정보!A2:E';  // 문항정보 시트의 A2:E 열까지

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
    }).then((response) => {
        const data = response.result.values;
        if (data) {
            renderMenu(data);
        }
    }).catch(error => {
        console.error('Error loading question data:', error);
    });
}

function renderMenu(data) {
    const navList = document.getElementById('navList');
    navList.innerHTML = '';  // 기존 메뉴 초기화

    const examMap = new Map();

    data.forEach(row => {
        const examName = row[1];
        if (!examMap.has(examName)) {
            examMap.set(examName, []);
        }
        examMap.get(examName).push({ questionNumber: row[2], url: row[0] });
    });

    examMap.forEach((questions, examName) => {
        const examItem = document.createElement('li');
        examItem.textContent = examName;
        examItem.classList.add('menu-item');
        examItem.addEventListener('click', () => loadProblem(1, examName));

        navList.appendChild(examItem);
    });
}

function loadProblem(problemNumber, examName) {
    const problemData = getProblemData(examName, problemNumber);
    if (problemData) {
        const url = `https://educodingnplaycontents.s3.amazonaws.com/${problemData.url}`;
        document.getElementById('iframeContent').src = url;
        renderProblemNavigation(problemData.totalProblems, problemNumber, examName);
    }
}

function getProblemData(examName, problemNumber) {
    const problems = examMap.get(examName);
    return problems ? {
        ...problems[problemNumber - 1],
        totalProblems: problems.length
    } : null;
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
        problemBtn.addEventListener('click', () => loadProblem(i, examName));
        navContainer.appendChild(problemBtn);
    }
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
