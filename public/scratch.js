function loadConfig() {
    return fetch('/config')
        .then(response => response.json())
        .then(data => {
            console.log('Config loaded:', data);
            config = data;
        })
        .catch(error => {
            console.error('Error loading config:', error);
            displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
        });
}

function initClient() {
    console.log('Initializing Google API client');
    gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        console.log('Google API client initialized');
        loadSB2Data();
    }).catch(error => {
        console.error('Error initializing Google API client', error);
        displayErrorMessage("Google API 클라이언트 초기화 중 오류가 발생했습니다.");
    });
}

function loadSB2Data() {
    console.log('Loading SB2 data');
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: RANGE,
    }).then((response) => {
        console.log('SB2 data loaded:', response.result);
        const data = response.result.values;
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    }).catch(error => {
        console.error('Error loading SB2 data', error);
        displayErrorMessage("SB2 데이터를 불러오는 중 오류가 발생했습니다.");
    });
}

document.addEventListener("DOMContentLoaded", function() {
    loadConfig().then(() => {
        gapi.load('client', initClient);
    });

    // "새로 시작하기" 버튼 클릭 이벤트
    $("#newStartButton").click(function() {
        window.location.href = "http://localhost:8601";
    });

    // 기존 프로젝트 로드 버튼 클릭 이벤트
    $(document).on("click", ".load-sb2", function() {
        const sb2Url = $(this).data("url");
        window.location.href = `http://localhost:8601#${sb2Url}`;
    });
});