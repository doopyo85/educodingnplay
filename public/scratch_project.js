// 권한 정책 정의
const ACCESS_POLICIES = {
    FEATURES: {
        'PPT_BUTTON': ['admin', 'teacher', 'manager', 'school'],
        'USER_MANAGE': ['admin'],
        'CONTENT_EDIT': ['admin', 'manager', 'teacher']
    }
};

// 권한 확인 함수
function hasFeatureAccess(userRole, feature) {
    return ACCESS_POLICIES.FEATURES[feature]?.includes(userRole) || false;
}

let userRole;

document.addEventListener("DOMContentLoaded", async function() {
    try {
        userRole = await getUserRole();
        console.log('User role:', userRole);
        loadProjectData();
    } catch (error) {
        console.error('Error loading user role:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
});

async function getUserRole() {
    try {
        const response = await fetch('/get-user-session');
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const data = await response.json();
        console.log('Session data received:', data);
        // role 속성이 존재하고 유효한 값인지 확인
        if (data && data.role && typeof data.role === 'string') {
            return data.role;
        }
        return 'guest';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'guest';
    }
}

async function loadProjectData() {
    try {
        // 역할에 따라 다른 API 엔드포인트 호출
        const endpoint = ['student', 'guest'].includes(userRole) ? '/api/get-sb3-data' : '/api/get-sb2-data';
        console.log('Using endpoint for role:', userRole, endpoint);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Project data loaded:', data);
        
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("프로젝트 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading project data:', error);
        displayErrorMessage("프로젝트 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        if (!Array.isArray(row) || row.length < 2) {
            console.warn('Invalid row data:', row);
            return;
        }

        const [name, url, ctElement = ''] = row;
        const baseName = name.replace(/(\(기본\)|\(확장1\)|\(확장2\)|\(ppt\))/, '').trim();
        
        if (!projects[baseName]) {
            projects[baseName] = { 
                ctElement: ctElement || '', 
                basic: '', 
                ext1: '', 
                ext2: '', 
                ppt: '' 
            };
        }

        if (name.includes('(기본)')) {
            projects[baseName].basic = url;
            if (ctElement) projects[baseName].ctElement = ctElement;
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
    
    // PPT 버튼 표시 권한 확인
    const showPPT = hasFeatureAccess(userRole, 'PPT_BUTTON');
    console.log('Current role:', userRole, 'Can show PPT:', showPPT);

    Object.keys(projects).forEach(projectName => {
        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text">
                        <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                    </p>
                    <div class="btn-group w-100 mb-2">
                        ${project.basic ? `
                            <button class="btn btn-primary load-project" data-url="${project.basic}">
                                기본
                            </button>` : ''}
                        ${project.ext1 ? `
                            <button class="btn btn-primary load-project" data-url="${project.ext1}">
                                확장1
                            </button>` : ''}
                        ${project.ext2 ? `
                            <button class="btn btn-primary load-project" data-url="${project.ext2}">
                                확장2
                            </button>` : ''}
                    </div>
                    ${showPPT && project.ppt ? `
                        <button class="btn btn-outline-secondary btn-sm w-100" onclick="window.open('${project.ppt}', '_blank')">
                            <i class="bi bi-file-earmark-slides"></i> PPT 보기
                        </button>` : ''}
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // 이벤트 리스너 추가
    document.querySelectorAll('.load-project').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const projectUrl = this.getAttribute('data-url');
            if (projectUrl) {
                loadProjectInScratchGUI(projectUrl);
            }
        });
    });
}

function loadProjectInScratchGUI(projectUrl) {
    if (!projectUrl) {
        console.error('Project URL is missing');
        return;
    }
    window.open(`/scratch/?project_file=${encodeURIComponent(projectUrl)}`, '_blank');
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">오류 발생</h4>
            <p>${message}</p>
        </div>
    `;
}