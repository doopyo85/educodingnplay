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

function getViewConfigForRole(userRole) {
    return {
        showPPTButton: ['admin', 'teacher', 'manager'].includes(userRole),
        showComplete: ['admin', 'teacher', 'manager'].includes(userRole),
        showExtension: ['admin', 'teacher', 'manager'].includes(userRole),
        canEdit: ['admin', 'teacher', 'manager'].includes(userRole)
    };
}

async function loadProjectData() {
    try {
        const response = await fetch('/api/get-ent-data');
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
        // 구글 시트 데이터 구조에 맞게 인덱스 조정
        const [category, name, type, url, ctElement = ''] = row;
        
        if (!projects[category]) {
            projects[category] = {};
        }
        
        const projectKey = name.trim();
        
        if (!projects[category][projectKey]) {
            projects[category][projectKey] = {
                name: projectKey,
                ctElement: ctElement,
                basic: '',
                complete: '',
                extension: '',
                ppt: ''
            };
        }
        
        // 타입에 따라 URL 할당
        switch(type.toLowerCase()) {
            case '기본':
                projects[category][projectKey].basic = url;
                break;
            case '완성':
                projects[category][projectKey].complete = url;
                break;
            case '확장':
                projects[category][projectKey].extension = url;
                break;
            case 'ppt':
                projects[category][projectKey].ppt = url;
                break;
        }
    });
    
    return projects;
}

async function initializeProjectView(userRole) {
    try {
        const viewConfig = getViewConfigForRole(userRole);
        const projectData = await loadProjectData();
        
        if (projectData && projectData.length > 0) {
            const projects = groupByProject(projectData);
            displayTabsAndProjects(projects, viewConfig);
        } else {
            displayErrorMessage("프로젝트 데이터가 없습니다.");
        }
    } catch (error) {
        console.error('Error:', error);
        displayErrorMessage("프로젝트 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function displayTabsAndProjects(projects, viewConfig) {
    const tabsContainer = document.getElementById('categoryTabs');
    const contentContainer = document.getElementById('content-container');
    
    // 초기화
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    
    // 탭과 콘텐츠 생성
    Object.keys(projects).forEach((category, index) => {
        // 탭 생성
        const tabButton = document.createElement('li');
        tabButton.className = 'nav-item';
        tabButton.innerHTML = `
            <button class="nav-link ${index === 0 ? 'active' : ''}" 
                    id="tab-${index}" 
                    data-bs-toggle="tab" 
                    data-bs-target="#content-${index}" 
                    type="button" 
                    role="tab">
                ${category}
            </button>
        `;
        tabsContainer.appendChild(tabButton);
        
        // 콘텐츠 패널 생성
        const contentPanel = document.createElement('div');
        contentPanel.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        contentPanel.id = `content-${index}`;
        
        // 프로젝트 카드 컨테이너
        const cardContainer = document.createElement('div');
        cardContainer.className = 'row';
        
        // 카테고리 내 프로젝트들에 대한 카드 생성
        Object.values(projects[category]).forEach(project => {
            cardContainer.appendChild(createProjectCard(project, viewConfig));
        });
        
        contentPanel.appendChild(cardContainer);
        contentContainer.appendChild(contentPanel);
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

function loadProjectInEntryGUI(projectUrl) {
    if (!projectUrl) {
        console.error('Project URL is missing');
        return;
    }
    window.open(`/entry/?project_file=${encodeURIComponent(projectUrl)}`, '_blank');
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

// 이벤트 리스너
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('load-project')) {
        e.preventDefault();
        const projectUrl = e.target.getAttribute('data-url');
        if (projectUrl) {
            loadProjectInEntryGUI(projectUrl);
        }
    }
});