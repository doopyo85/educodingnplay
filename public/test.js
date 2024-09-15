var currentProblemNumber = 1;
var totalProblems = 10;
var currentExamName = '';
var problemData = [];

document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners(); // 이벤트 리스너 설정
    fetchProblemData();     // 서버에서 문제 데이터를 가져옴
});


// Google API 클라이언트 로드 및 초기화
function loadGoogleAPI() {
    gapi.load('client', initClient);
}

// Google API 클라이언트 초기화
function initClient() {
    const apiKey = document.getElementById('googleApiKey').value;
    const spreadsheetId = document.getElementById('spreadsheetId').value;

    gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    }).then(() => {
        console.log('Google API client initialized');
        return loadProblemData(spreadsheetId);
    }).then((problemData) => {
        if (problemData && problemData.length > 0) {
            window.problemData = problemData;
            if (currentExamName) {
                loadProblem(currentProblemNumber);
            }
        }
    }).catch(error => {
        console.error('Error initializing Google API:', error);
    });
}

// 서버에서 문제 데이터 가져오는 함수
function fetchProblemData() {
    fetch('/test', { credentials: 'include' })  // 서버에서 /test 엔드포인트로부터 데이터 요청
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data && data.problemData && data.problemData.length > 0) {
                problemData = data.problemData;
                totalProblems = problemData.length;
                if (currentExamName) {
                    loadProblem(currentProblemNumber);
                }
            } else {
                throw new Error('No problem data loaded');
            }
        })
        .catch(error => {
            console.error('Error fetching problem data from server:', error);
        });
}

function setupEventListeners() {
    const runCodeBtn = document.getElementById('runCodeBtn');
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', function() {
            const editor = document.querySelector('code-editor');
            if (editor) {
                const code = editor.getCode(); // 코드 에디터에서 코드를 가져옴
                document.getElementById('output-content').innerText = `Running code:\n${code}`;
            } else {
                document.getElementById('output-content').innerText = "Editor not found!";
            }
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

function loadProblem(problemNumber) {
    console.log('Loading problem:', currentExamName, problemNumber);
    
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
    }
}

// 창 크기가 변경될 때마다 iframe 크기를 조정합니다
window.addEventListener('resize', function() {
    const iframe = document.getElementById('iframeContent');
    if (iframe) {
        resizeIframe(iframe);
    }
});
