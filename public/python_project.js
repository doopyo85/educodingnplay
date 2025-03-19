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

// initClient 함수
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
    }).then(() => {
        return loadProblemData();
    }).catch(error => {
        console.error('Error in initialization process:', error);
    });
}

// 구글 시트에서 메뉴 데이터 가져오기 - 수정된 버전
async function loadMenuData(spreadsheetId) {
    console.log('Loading menu data from spreadsheet ID:', spreadsheetId);
    
    try {
        // API를 통해 데이터 가져오기
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'menulist!A2:C', // 메뉴 데이터가 있는 범위
        });
        
        console.log('Raw menu data response:', response);
        
        const menuData = response.result.values;
        if (menuData && menuData.length > 0) {
            console.log('Menu data loaded successfully:', menuData);
            renderMenu(menuData);
            return menuData;
        } else {
            console.error('No menu data found in the spreadsheet');
            // 서버 API를 대안으로 시도
            return loadMenuDataFromServer();
        }
    } catch (error) {
        console.error('Error loading menu data from Google Sheets:', error);
        // 구글 시트 API 호출 실패 시 서버 API 호출 시도
        return loadMenuDataFromServer();
    }
}


// 서버 API에서 메뉴 데이터 가져오기
async function loadMenuDataFromServer() {
    console.log('Attempting to load menu data from server API');
    try {
        const response = await fetch('/api/get-menu-data');
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const menuData = await response.json();
        if (menuData && menuData.length > 0) {
            console.log('Menu data loaded from server API:', menuData);
            renderMenu(menuData);
            return menuData;
        } else {
            throw new Error('No menu data received from server API');
        }
    } catch (error) {
        console.error('Error loading menu data from server API:', error);
        // 빈 메뉴로 렌더링
        renderMenu([]);
        return [];
    }
}
// 서버에서 문제 데이터 가져오기 - 수정된 버전
async function loadProblemData() {
    console.log('Loading problem data');
    try {
        // 구글 시트에서 데이터 가져오기 시도
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: document.getElementById('spreadsheetId').value,
                range: '문항정보!A:C', // 문제 데이터가 있는 범위
            });
            
            console.log('Problem data response from Google Sheets:', response);
            
            if (response.result.values && response.result.values.length > 0) {
                problemData = response.result.values;
                console.log('Problem data loaded from Google Sheets:', problemData);
                return problemData;
            }
        } catch (error) {
            console.error('Error loading problem data from Google Sheets:', error);
        }
        
        // 구글 시트에서 가져오기 실패한 경우 서버 API 사용
        const response = await fetch('/api/get-problem-data');
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.length > 0) {
            problemData = data;
            console.log('Problem data loaded from server API:', problemData);
            return problemData;
        } else {
            throw new Error('No problem data found');
        }
    } catch (error) {
        console.error('Error loading problem data:', error);
        return [];
    }
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