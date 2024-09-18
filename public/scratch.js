const RANGE = 'sb2!A2:C'; // 이 페이지에 특화된 RANGE 정의

let config;

function loadConfig() {
    return fetch('/config')
        .then(response => response.json())
        .then(data => {
            config = data;
        })
        .catch(error => {
            console.error('Error loading config:', error);
        });
}

function initClient() {
    gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    }).then(() => {
        loadSB2Data();
    }).catch(error => {
        console.error('Error initializing Google API client', error);
        displayErrorMessage("Google API 클라이언트 초기화 중 오류가 발생했습니다.");
    });
}

function loadSB2Data() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: RANGE,
    }).then((response) => {
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

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        const [name, url, ctElement] = row;
        const baseName = name.replace(/(\(기본\)|\(확장1\)|\(확장2\))/, '').trim();
        if (!projects[baseName]) {
            projects[baseName] = { ctElement: ctElement, basic: '', ext1: '', ext2: '' };
        }
        if (name.includes('(기본)')) {
            projects[baseName].basic = url;
        } else if (name.includes('(확장1)')) {
            projects[baseName].ext1 = url;
        } else if (name.includes('(확장2)')) {
            projects[baseName].ext2 = url;
        }
    });
    return projects;
}

function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; // Clear existing content
    Object.keys(projects).forEach(projectName => {
        if (projectName === '새로 시작하기') return;

        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text"><i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}</p>
                    <p class="card-text">이 콘텐츠를 통해 재미있는 프로젝트를 경험해보세요.</p>
                    <div class="btn-group">
                        ${project.basic ? `<button class="btn btn-primary load-sb2" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn btn-secondary load-sb2" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn btn-secondary load-sb2" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                </div>
            </div>
        `;
        card.innerHTML = cardContent;
        container.appendChild(card);
    });
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}

document.addEventListener("DOMContentLoaded", function() {
    loadConfig().then(() => {
        gapi.load('client', initClient);
    });

    // "새로 시작하기" 버튼 클릭 이벤트
    $("#newStartButton").click(function() {
        window.location.href = "https://codingnplay.site/scratch-gui";
    });

    // 기존 프로젝트 로드 버튼 클릭 이벤트
    $(document).on("click", ".load-sb2", function() {
        const sb2Url = $(this).data("url");
        window.location.href = `https://codingnplay.site/scratch-gui#${sb2Url}`;
    });
});