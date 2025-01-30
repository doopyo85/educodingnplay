let RANGE;
let userRole;

document.addEventListener("DOMContentLoaded", async function() {
    try {
        userRole = await getUserRole();
        RANGE = setRangeByRole(userRole);
        console.log('User role:', userRole);
        console.log('RANGE set to:', RANGE);
        loadProjectData();
    } catch (error) {
        console.error('Error loading user role:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
});

async function getUserRole() {
    const response = await fetch('/api/get-user-type');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const { userType } = await response.json();
    return userType;
}

// 역할에 따라 RANGE 설정 (학생/게스트는 sb3, 나머지는 sb2)
function setRangeByRole(role) {
    // 반대로 수정: 교사/관리자는 sb2, 학생은 sb3
    return ['student', 'guest'].includes(role) ? 'sb3!A2:D' : 'sb2!A2:D';
}

// 역할에 따라 파일 URL 변환
function convertUrlByRole(url, role) {
    if (['student', 'guest'].includes(role)) {
        // sb2 URL을 sb3 URL로 변환
        return url.replace('/sb2/', '/sb3/').replace('.sb2', '.sb3');
    }
    return url; // 교사/관리자는 원래 URL(sb2) 사용
}

async function loadProjectData() {
    try {
        const response = await fetch('/api/get-sheet-data?range=' + RANGE);
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const data = await response.json();
        
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading project data:', error);
        displayErrorMessage("프로젝트 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        const [name, url, ctElement] = row;
        const baseName = name.replace(/(\(기본\)|\(확장1\)|\(확장2\)|\(ppt\))/, '').trim();
        
        if (!projects[baseName]) {
            projects[baseName] = { 
                ctElement: ctElement, 
                basic: '', 
                ext1: '', 
                ext2: '', 
                ppt: '' 
            };
        }

        // URL을 역할에 따라 변환
        const convertedUrl = convertUrlByRole(url, userRole);

        if (name.includes('(기본)')) {
            projects[baseName].basic = convertedUrl;
        } else if (name.includes('(확장1)')) {
            projects[baseName].ext1 = convertedUrl;
        } else if (name.includes('(확장2)')) {
            projects[baseName].ext2 = convertedUrl;
        } else if (name.includes('(ppt)')) {
            projects[baseName].ppt = url; // PPT URL은 변환하지 않음
        }
    });
    return projects;
}

function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';
    
    // 교사/관리자 계정인 경우에만 PPT 버튼 표시
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
                        ${project.basic ? `<button class="btn btn-primary load-project" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn btn-primary load-project" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn btn-primary load-project" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                    ${showPPT && project.ppt ? 
                        `<div class="mt-2">
                            <button class="btn btn-outline-secondary btn-sm w-100 open-ppt" data-url="${project.ppt}">
                                <i class="bi bi-file-earmark-slides"></i> PPT 보기
                            </button>
                        </div>` 
                        : ''}
                </div>
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

    // PPT 버튼 이벤트 리스너
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
    window.open(`/scratch/?project_file=${encodeURIComponent(projectUrl)}`, '_blank');
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}