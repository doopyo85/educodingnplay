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

// 사용자 타입 가져오는 함수 추가
async function getUserType() {
    try {
        const response = await fetch('/api/get-user-type');
        if (!response.ok) {
            throw new Error('사용자 유형을 가져오는 데 실패했습니다.');
        }
        const { userType } = await response.json();
        return userType;
    } catch (error) {
        console.error('Error getting user type:', error);
        return 'student';  // 기본값은 학생
    }
}

// 초기화 함수 수정
async function initializeProjectView(userRole) {
    try {
        const userType = await getUserType();  // 사용자 타입 가져오기
        const viewConfig = getViewConfigForRole(userType);  // userRole 대신 userType 사용
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

// 역할에 따른 뷰 설정 함수 수정
function getViewConfigForRole(userType) {
    return {
        showPPTButton: ['admin', 'teacher', 'manager'].includes(userType),
        showComplete: ['admin', 'teacher', 'manager'].includes(userType),
        canEdit: ['admin', 'teacher', 'manager'].includes(userType)
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
        if (!Array.isArray(row) || row.length < 5) return;

        const [category, name, type, url, ctElement = '', imgUrl = ''] = row;
        const baseName = name.replace(/\([^)]*\)/g, '').trim();
        
        if (!projects[category]) {
            projects[category] = {};
        }

        if (!projects[category][baseName]) {
            projects[category][baseName] = {
                name: baseName,
                ctElement: ctElement,
                img: imgUrl,
                basic: '',
                complete: '',
                extension: '',
                ppt: ''
            };
        }

        // 기능 컬럼의 값에 따라 URL 할당
        switch(type.toLowerCase()) {
            case '기본':
                projects[category][baseName].basic = url;
                break;
            case '완성':
                projects[category][baseName].complete = url;
                break;
            case '확장':
                projects[category][baseName].extension = url;
                break;
            case 'ppt':
                projects[category][baseName].ppt = url;
                break;
        }
    });
    return projects;
}

function displayTabsAndProjects(projects, viewConfig) {
    const tabsContainer = document.getElementById('categoryTabs');
    const contentContainer = document.getElementById('content-container');

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    // 탭 생성
    const categories = Object.keys(projects);
    categories.forEach((category, index) => {
        // 탭 버튼 생성
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

        // 탭 콘텐츠 생성
        const tabContent = document.createElement('div');
        tabContent.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        tabContent.id = `content-${index}`;
        tabContent.role = 'tabpanel';

        // 프로젝트 카드 컨테이너
        const cardContainer = document.createElement('div');
        cardContainer.className = 'row';

        // 해당 카테고리의 프로젝트들을 카드로 표시
        Object.values(projects[category]).forEach(project => {
            const card = createProjectCard(project, viewConfig);
            cardContainer.appendChild(card);
        });

        tabContent.appendChild(cardContainer);
        contentContainer.appendChild(tabContent);
    });
}

function createProjectCard(project, viewConfig) {
    const card = document.createElement('div');
    card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

    const cardContent = `
        <div class="card h-100 position-relative">
            ${project.img ? `
                <img src="${project.img}" class="card-img-top" alt="${project.name}">
            ` : ''}
            <div class="card-body">
                <h5 class="card-title mb-2">${project.name}</h5>
                <p class="card-text">
                    <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                </p>
                <div class="btn-group mb-2">
                    ${project.basic ? createProjectButton('기본', project.basic, 'btn-secondary') : ''}
                    ${viewConfig.showComplete && project.complete ? createProjectButton('완성', project.complete, 'btn-secondary') : ''}
                    ${project.extension ? createProjectButton('확장', project.extension, 'btn-secondary') : ''}
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

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('load-project')) {
        e.preventDefault();
        const projectUrl = e.target.getAttribute('data-url');
        if (projectUrl) {
            loadProjectInEntryGUI(projectUrl);
        }
    }
});