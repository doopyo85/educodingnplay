let RANGE;
let userRole; // 사용자 역할을 저장할 전역 변수

document.addEventListener("DOMContentLoaded", async function() {
    try {
        userRole = await getUserRole();  // 사용자 역할을 가져옴
        RANGE = setRangeByRole(userRole);
        console.log('User role:', userRole);
        console.log('RANGE set to:', RANGE);
        loadsb3Data();
    } catch (error) {
        console.error('Error loading user role:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
});

// 사용자 역할을 가져오는 함수
async function getUserRole() {
    const response = await fetch('/api/get-user-type');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const { userType } = await response.json();
    return userType;
}

// 역할에 따라 RANGE 설정
function setRangeByRole(role) {
    return ['student', 'guest'].includes(role) ? 'sb3!A2:C' : 'sb2!A2:C';
}

// 역할에 따라 프로젝트 파일 확장자 결정
function getFileExtension(role) {
    return ['student', 'guest'].includes(role) ? 'sb3' : 'sb2';
}

async function loadsb3Data() {
    try {
        const data = await fetch('/api/get-sb3-data').then(res => res.json());
        console.log('Project data loaded:', data);
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading project data', error);
        displayErrorMessage("프로젝트 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

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
            projects[baseName].ppt = url;
        }
    });
    return projects;
}

function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';
    
    const showPPT = ['manager', 'teacher', 'admin'].includes(userRole);

    Object.keys(projects).forEach(projectName => {
        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text">
                        <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                    </p>
                    <div class="btn-group">
                        ${project.basic ? `<button class="btn load-project" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn load-project" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn load-project" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                </div>
                ${showPPT && project.ppt ? `<button class="btn btn-outline-secondary btn-sm open-ppt" data-url="${project.ppt}">ppt</button>` : ''}
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // 프로젝트 파일 로드 이벤트 리스너
    document.querySelectorAll('.load-project').forEach(button => {
        button.addEventListener('click', function() {
            const projectUrl = this.getAttribute('data-url');
            loadProjectInScratchGUI(projectUrl);
        });
    });

    // PPT 버튼 이벤트 리스너 (관리자/교사용)
    if (showPPT) {
        document.querySelectorAll('.open-ppt').forEach(button => {
            button.addEventListener('click', function() {
                const pptUrl = this.getAttribute('data-url');
                window.open(pptUrl, '_blank');
            });
        });
    }
}

function loadProjectInScratchGUI(projectUrl) {
    const fileExt = getFileExtension(userRole);
    window.open(`/scratch/?project_file=${encodeURIComponent(projectUrl)}&file_ext=${fileExt}`, '_blank');
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}