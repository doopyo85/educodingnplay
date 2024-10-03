let RANGE;  // 계정 유형에 따라 동적으로 변경될 변수

document.addEventListener("DOMContentLoaded", async function() {
    try {
        const userType = await getUserType();  // 사용자 계정 유형을 가져옴
        RANGE = userType === 'student' ? 'sb3!A2:C' : 'sb3!A2:C';  // 계정 유형에 따라 RANGE 설정
        console.log('RANGE set to:', RANGE);
        loadsb3Data();  // sb3 데이터를 바로 로드
    } catch (error) {
        console.error('Error loading user type:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
});

// 사용자 계정 유형을 가져오는 함수
async function getUserType() {
    const response = await fetch('/api/get-user-type');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const { userType } = await response.json();
    return userType;
}

// 서버의 API에서 sb3 데이터를 가져오는 함수
async function loadsb3Data() {
    try {
        const data = await fetch('/api/get-sb3-data').then(res => res.json());
        console.log('sb3 data loaded:', data);  // 데이터가 제대로 로드되었는지 확인
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);  // 프로젝트를 화면에 출력
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading sb3 data', error);
        displayErrorMessage("sb3 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// 프로젝트 데이터를 그룹화하는 함수 (ppt URL 포함)
function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        const [name, url, ctElement] = row;
        const baseName = name.replace(/(\(기본\)|\(확장1\)|\(확장2\)|\(ppt\))/, '').trim();
        if (!projects[baseName]) {
            projects[baseName] = { ctElement: ctElement, basic: '', ext1: '', ext2: '', ppt: '' };
        }
        if (name.includes('(기본)')) {
            projects[baseName].basic = url;
        } else if (name.includes('(확장1)')) {
            projects[baseName].ext1 = url;
        } else if (name.includes('(확장2)')) {
            projects[baseName].ext2 = url;
        } else if (name.includes('(ppt)')) {
            projects[baseName].ppt = url;  // ppt URL 추가
        }
    });
    return projects;
}

function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; 

    Object.keys(projects).forEach(projectName => {
        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card h-100 position-relative">
                <div class="card-body" style="padding-right: 50px;"> <!-- ppt 버튼과 제목이 겹치지 않도록 우측 padding -->
                    <h5 class="card-title text-start text-truncate-2">${projectName}</h5>
                    <p class="card-text text-start">
                        <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                    </p>
                    <div class="btn-group justify-content-center"> <!-- 가운데 정렬 -->
                        ${project.basic ? `<button class="btn btn-primary load-sb3" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn btn-secondary load-sb3" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn btn-secondary load-sb3" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                </div>
                ${project.ppt ? `<button class="btn btn-outline-secondary btn-sm open-ppt position-absolute top-0 end-0 m-2" data-url="${project.ppt}">ppt</button>` : ''}
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // sb3 파일 로드 이벤트 리스너 추가
    document.querySelectorAll('.load-sb3').forEach(button => {
        button.addEventListener('click', function() {
            const sb3Url = this.getAttribute('data-url');
            loadsb3InScratchGUI(sb3Url);
        });
    });

    // ppt 버튼 클릭 이벤트 리스너 추가
    document.querySelectorAll('.open-ppt').forEach(button => {
        button.addEventListener('click', function() {
            const pptUrl = this.getAttribute('data-url');
            window.open(pptUrl, '_blank');
        });
    });
}


// Scratch-GUI에서 sb3 파일 로드하는 함수
function loadsb3InScratchGUI(sb3Url) {
    // URL을 인코딩하여 Scratch-GUI로 전달
    const scratchEditorUrl = `https://codingnplay.site/scratch/?project_file=${encodeURIComponent(sb3Url)}`;
    console.log(`Opening Scratch GUI with sb3 URL: ${scratchEditorUrl}`);
    
    // 새로운 창으로 Scratch-GUI 열기
    window.open(scratchEditorUrl, '_blank');
}

// 오류 메시지를 화면에 출력하는 함수
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
