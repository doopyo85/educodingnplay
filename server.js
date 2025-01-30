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
        const response = await fetch('/api/get-user-type');
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        const data = await response.json();
        return data.userType;
    } catch (error) {
        console.error('Error:', error);
        return 'guest'; // 기본값으로 guest 설정
    }
}

async function loadProjectData() {
    try {
        // 역할에 따라 다른 API 엔드포인트 호출
        const endpoint = ['student', 'guest'].includes(userRole) ? '/api/get-sb3-data' : '/api/get-sb2-data';
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
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
        if (!Array.isArray(row) || row.length < 3) {
            console.warn('Invalid row data:', row);
            return;
        }

        const [name, url, ctElement] = row;
        if (!name || !url) {
            console.warn('Missing required data in row:', row);
            return;
        }

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
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text">
                        <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                    </p>
                    <div class="btn-group d-flex flex-wrap gap-2 mb-2">
                        ${project.basic ? `
                            <button class="btn btn-primary btn-sm load-project" data-url="${project.basic}">
                                기본
                            </button>` : ''}
                        ${project.ext1 ? `
                            <button class="btn btn-primary btn-sm load-project" data-url="${project.ext1}">
                                확장1
                            </button>` : ''}
                        ${project.ext2 ? `
                            <button class="btn btn-primary btn-sm load-project" data-url="${project.ext2}">
                                확장2
                            </button>` : ''}
                    </div>
                    ${showPPT && project.ppt ? `
                        <div class="mt-auto">
                            <button class="btn btn-outline-secondary btn-sm w-100 open-ppt" data-url="${project.ppt}">
                                <i class="bi bi-file-earmark-slides"></i> PPT 보기
                            </button>
                        </div>` : ''}
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

    if (showPPT) {
        document.querySelectorAll('.open-ppt').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const pptUrl = this.getAttribute('data-url');
                if (pptUrl) {
                    window.open(pptUrl, '_blank');
                }
            });
        });
    }
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