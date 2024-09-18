let config;

document.addEventListener("DOMContentLoaded", async function() {
    await loadConfig();  // config 로드
    console.log('Config:', config);  // config가 제대로 로드되었는지 확인
    loadGapi();  // gapi 라이브러리 로드
});

const RANGE = 'sb2!A2:C';

async function loadSB2Data() {
  try {
    const data = await fetch('/api/get-sb2-data').then(res => res.json());
    if (data && data.length > 0) {
      const projects = groupByProject(data);
      displayProjects(projects);
    } else {
      displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error('Error loading SB2 data', error);
    displayErrorMessage("SB2 데이터를 불러오는 중 오류가 발생했습니다.");
  }
}
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        config = await response.json();
        console.log('Config loaded:', config);
    } catch (error) {
        console.error('Error loading config:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
}

function loadGapi() {
    if (typeof gapi === 'undefined') {
        console.error('Google API not loaded');
        return;
    }
    gapi.load('client', initClient);
}

async function initClient() {
    if (!config || !config.apiKey || !config.spreadsheetId || !config.discoveryDocs) {
        console.error('Config is missing required fields:', config);
        displayErrorMessage("API 설정이 올바르지 않습니다.");
        return;
    }

    try {
        console.log('Initializing Google API client with config:', config);
        await gapi.client.init({
            apiKey: config.apiKey,
            discoveryDocs: config.discoveryDocs,
        });
        console.log('Google API client initialized');
        await gapi.client.load('sheets', 'v4');
        loadSB2Data();
    } catch (error) {
        console.error('Error initializing Google API client', error);
        displayErrorMessage("Google API 클라이언트 초기화 중 오류가 발생했습니다.");
    }
}


async function loadSB2Data() {
    try {
        console.log('Loading SB2 data from range:', RANGE);
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: RANGE,
        });
        console.log('SB2 data loaded:', response.result);
        const data = response.result.values;
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading SB2 data', error);
        displayErrorMessage("SB2 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}


function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        console.log(row);  // 각 row가 어떻게 생겼는지 확인
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
    console.log('Grouped Projects:', projects);  // 그룹화된 결과 확인
    return projects;
}


function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; // 기존 내용을 초기화
    console.log('Displaying projects:', projects);  // 출력할 프로젝트 확인

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
        console.log('Appending card for project:', projectName);  // 카드가 추가되기 전에 확인
        container.appendChild(card);
    });
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}

