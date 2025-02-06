document.addEventListener("DOMContentLoaded", async function() {
    try {
        // hidden 필드에서 사용자 정보 가져오기
        const userRole = document.getElementById('user-role').value;
        const userID = document.getElementById('user-id').value;
        const centerID = document.getElementById('center-id').value;

        if (!userRole) {
            throw new Error('사용자 권한 정보를 찾을 수 없습니다.');
        }

        console.log('User Info:', { userRole, userID, centerID });
        await initializeProjectView(userRole);
    } catch (error) {
        console.error('Error:', error);
        displayErrorMessage("초기화 중 오류가 발생했습니다.");
    }
});

// 프로젝트 뷰 초기화
async function initializeProjectView(userRole) {
    try {
        const viewConfig = getViewConfigForRole(userRole);
        const projectData = await loadProjectData(userRole);
        
        if (projectData && projectData.length > 0) {
            const projects = groupByProject(projectData);
            displayProjects(projects, viewConfig);
        } else {
            displayErrorMessage("프로젝트 데이터가 없습니다.");
        }
    } catch (error) {
        console.error('Error:', error);
        displayErrorMessage("프로젝트 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}


// 역할별 뷰 설정
function getViewConfigForRole(userRole) {
    return {
        showPPTButton: ['admin', 'teacher', 'manager'].includes(userRole),
        fileType: userRole === 'teacher' ? 'sb2' : 'sb3',
        showExtensions: ['admin', 'teacher', 'manager'].includes(userRole),
        canEdit: ['admin', 'teacher', 'manager'].includes(userRole)
    };
}

// 프로젝트 데이터 로드

// API 호출 수정
async function loadProjectData(userRole) {
    try {
        // 역할에 따라 적절한 엔드포인트 선택
        const endpoint = ['admin', 'teacher', 'manager'].includes(userRole)
            ? '/api/get-sb2-data'
            : '/api/get-sb3-data';
            
        console.log('Loading projects from:', endpoint);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error loading project data:', error);
        throw error;
    }
}

// 프로젝트 그룹화
function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        if (!Array.isArray(row) || row.length < 2) return;

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

// 프로젝트 표시
function displayProjects(projects, viewConfig) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';

    Object.entries(projects).forEach(([projectName, project]) => {
        const card = createProjectCard(projectName, project, viewConfig);
        container.appendChild(card);
    });
}

// 프로젝트 카드 생성
function createProjectCard(projectName, project, viewConfig) {
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    const cardContent = `
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="card-title mb-0">${projectName}</h5>
                    ${viewConfig.showPPTButton && project.ppt ? `
                        <button class="btn btn-sm" onclick="window.open('${project.ppt}', '_blank')" 
                            style="padding: 2px 8px;">
                            <i class="bi bi-file-earmark-slides-fill"></i> PPT
                        </button>
                    ` : ''}
                </div>
                <p class="card-text">
                    <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                </p>
                <div class="btn-group w-100 mb-2">
                    ${project.basic ? createProjectButton('기본', project.basic) : ''}
                    ${viewConfig.showExtensions && project.ext1 ? createProjectButton('확장1', project.ext1) : ''}
                    ${viewConfig.showExtensions && project.ext2 ? createProjectButton('확장2', project.ext2) : ''}
                </div>
            </div>
        </div>
    `;

    card.innerHTML = cardContent;
    return card;
}

// 프로젝트 버튼 생성
function createProjectButton(label, url) {
    return `
        <button class="btn btn-primary load-project" data-url="${url}">
            ${label}
        </button>
    `;
}

// PPT 버튼 생성
function createPPTButton(url) {
    return `
        <button class="btn btn-outline-secondary btn-sm w-100" onclick="window.open('${url}', '_blank')">
            <i class="bi bi-file-earmark-slides"></i> PPT 보기
        </button>
    `;
}

// 스크래치 GUI에서 프로젝트 로드
function loadProjectInScratchGUI(projectUrl) {
    if (!projectUrl) {
        console.error('Project URL is missing');
        return;
    }
    window.open(`/scratch/?project_file=${encodeURIComponent(projectUrl)}`, '_blank');
}

// 에러 메시지 표시
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">오류 발생</h4>
            <p>${message}</p>
        </div>
    `;
}

// 이벤트 리스너 등록
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('load-project')) {
        e.preventDefault();
        const projectUrl = e.target.getAttribute('data-url');
        if (projectUrl) {
            loadProjectInScratchGUI(projectUrl);
        }
    }
});