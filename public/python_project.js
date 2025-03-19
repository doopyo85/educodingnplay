// 전역 변수 선언을 파일 맨 위로 이동하고 모두 var로 변경
var currentProblemNumber = 1;
var totalProblems = 0;  // 초기값을 0으로 설정
var currentExamName = '';
var problemData = [];
var editorToggleInitialized = false; // 토글 기능 초기화 여부를 추적

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
    setupEventListeners(); // 이벤트 리스너 설정
    initEditorToggle(); // 에디터 토글 기능 초기화
});

// 에디터 토글 기능 초기화 함수
function initEditorToggle() {
    // 이미 초기화되었으면 실행하지 않음
    if (editorToggleInitialized) {
        return;
    }
    
    console.log('Initializing editor toggle functionality');
    
    // 토글 버튼 요소 찾기
    const toggleBtn = document.getElementById('toggleEditor');
    const contentsDiv = document.querySelector('.contents');
    
    if (!toggleBtn || !contentsDiv) {
        console.error('Toggle button or contents div not found');
        return;
    }
    
    console.log('Toggle button found, setting up click event');
    
    // 토글 상태 변수
    let isExpanded = false;
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    toggleBtn.removeEventListener('click', toggleEditorHandler);
    
    // 새로운 이벤트 리스너 추가
    toggleBtn.addEventListener('click', toggleEditorHandler);
    
    // 토글 핸들러 함수
    function toggleEditorHandler() {
        console.log('Toggle button clicked, current state:', isExpanded);
        isExpanded = !isExpanded;
        
        const ideContainer = document.querySelector('.ide-container');
        const contentContainer = document.querySelector('.content-container');
        
        if (isExpanded) {
            // 에디터 확장
            console.log('Expanding editor');
            ideContainer.style.width = '45%';
            ideContainer.style.flex = '0.9';
            contentContainer.style.width = '45%';
            contentContainer.style.flex = '0.9';
            toggleBtn.innerHTML = '<i class="bi bi-arrows-angle-contract"></i>';
            toggleBtn.setAttribute('title', '에디터 축소');
        } else {
            // 에디터 축소
            console.log('Collapsing editor');
            ideContainer.style.width = '40px';
            ideContainer.style.minWidth = '40px';
            ideContainer.style.flex = '0';
            contentContainer.style.width = '90%';
            contentContainer.style.flex = '1';
            toggleBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i>';
            toggleBtn.setAttribute('title', '에디터 확장');
        }
        
        // ACE 에디터 리사이징
        setTimeout(() => {
            var editor = ace.edit("editor");
            if (editor) {
                editor.resize();
                console.log('Ace editor resized');
            }
        }, 300);
    }
    
    editorToggleInitialized = true;
    console.log('Editor toggle initialization complete');
}

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

// initClient 함수 수정
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
    }).then((loadedProblemData) => {
        if (loadedProblemData && loadedProblemData.length > 0) {
            console.log('Problem data loaded successfully');
            problemData = loadedProblemData; // 전역 변수에 할당
        } else {
            throw new Error('No problem data loaded');
        }
    }).catch(error => {
        console.error('Error in initialization process:', error);
    });
}


function setupEventListeners() {
    const runCodeBtn = document.getElementById('runCodeBtn');
    const prevButton = document.getElementById('prev-problem');
    const nextButton = document.getElementById('next-problem');

    // Ace 에디터와 연동된 코드 실행
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', function() {
            var editor = ace.edit("editor");  // Ace 에디터 가져오기
            const code = editor.getValue();  // 에디터에서 코드 가져오기
            document.getElementById('output-content').innerText = `Running code:\n${code}`;
            
            // 실제 서버로 코드 전송
            fetch('/run-python', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code }),
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById("output-content").textContent = data.output;
            })
            .catch(error => {
                document.getElementById("output-content").textContent = "코드 실행 중 오류 발생: " + error;
            });
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

// 나머지 함수는 그대로 유지...
// (기존 코드와 동일한 부분은 생략했습니다)

// 창 크기가 변경될 때마다 iframe 크기를 조정합니다
window.addEventListener('resize', function() {
    const iframe = document.getElementById('iframeContent');
    if (iframe) {
        resizeIframe(iframe);
    }
    
    // ACE 에디터 리사이징
    var editor = ace.edit("editor");
    if (editor) {
        editor.resize();
    }
});

// 페이지 로드 완료 시 실행
window.addEventListener('load', function() {
    console.log('Window load complete');
    
    // 에디터 토글 기능 초기화
    initEditorToggle();
    
    // 에디터 초기 설정
    try {
        var editor = ace.edit("editor");
        if (editor) {
            editor.resize();
            console.log('Ace editor initialized and resized');
        }
    } catch (e) {
        console.error('Error initializing Ace editor:', e);
    }
});