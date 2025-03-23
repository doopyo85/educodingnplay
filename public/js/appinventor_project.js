document.addEventListener("DOMContentLoaded", async function() {
    try {
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

function getViewConfigForRole(userRole) {
    // 사용자 권한에 따른 UI 설정
    return {
        showExtensions: ['admin', 'teacher', 'manager'].includes(userRole),
        showPPTButton: ['admin', 'teacher', 'manager'].includes(userRole)
    };
}

async function loadProjectData(userRole) {
    try {
        // 모든 사용자 역할에 대해 동일한 API 엔드포인트 사용
        const endpoint = '/api/get-aia-data';
        
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

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        if (!Array.isArray(row) || row.length < 4) return;

        // 새로운 데이터 구조에 맞춰 인덱스 조정
        const [category, name, type, url, ctElement = '', imgUrl = ''] = row;
        const baseName = name.replace(/\([^)]*\)/g, '').trim();
        
        if (!projects[baseName]) {
            projects[baseName] = {
                category: category,
                ctElement: ctElement,
                img: imgUrl,
                basic: '',
                ext1: '',
                ext2: '',
                ppt: ''
            };
        }

        // 기능 컬럼의 값에 따라 URL 할당
        switch(type.toLowerCase()) {
            case '기본':
                projects[baseName].basic = url;
                break;
            case '확장1':
                projects[baseName].ext1 = url;
                break;
            case '확장2':
                projects[baseName].ext2 = url;
                break;
            case 'ppt':
                projects[baseName].ppt = url;
                break;
        }
    });
    return projects;
}

function displayProjects(projects, viewConfig) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';

    Object.entries(projects).forEach(([projectName, project]) => {
        const card = createProjectCard(projectName, project, viewConfig);
        container.appendChild(card);
    });
}

function createProjectCard(projectName, project, viewConfig) {
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    const cardContent = `
        <div class="card h-100 position-relative">
            ${project.img ? `
                <img src="${project.img}" class="card-img-top" alt="${projectName}">
            ` : ''}
            <div class="card-body">
                <h5 class="card-title mb-2">${projectName}</h5>
                <p class="card-text">
                    <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                </p>
                <div class="btn-group mb-2">
                    ${project.basic ? createProjectButton('기본', project.basic, 'btn-secondary') : ''}
                    ${viewConfig.showExtensions && project.ext1 ? createProjectButton('확장1', project.ext1, 'btn-secondary') : ''}
                    ${viewConfig.showExtensions && project.ext2 ? createProjectButton('확장2', project.ext2, 'btn-secondary') : ''}
                </div>
            </div>
            ${viewConfig.showPPTButton && project.ppt ? `
                <button class="btn btn-outline-primary ppt-btn" 
                    onclick="window.open('${project.ppt}', '_blank')">PPT
                </button>
            ` : ''}
        </div>
    `;

    card.innerHTML = cardContent;
    return card;
}

function createProjectButton(label, url, type) {
    return `
        <button class="btn ${type} load-project" data-url="${url}">
            ${label}
        </button>
    `;
}

function loadProjectInAppInventor(projectUrl) {
    if (!projectUrl) {
        console.error('Project URL is missing');
        return;
    }
    
    // App Inventor 프로젝트 URL 형식에 맞게 수정
    window.open(`https://ai2.appinventor.mit.edu/?project=${encodeURIComponent(projectUrl)}`, '_blank');
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

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('load-project')) {
        e.preventDefault();
        const projectUrl = e.target.getAttribute('data-url');
        if (projectUrl) {
            loadProjectInAppInventor(projectUrl);
        }
    }
});