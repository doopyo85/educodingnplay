let RANGE;

document.addEventListener("DOMContentLoaded", async function() {
    try {
        const userType = await getUserType();
        RANGE = userType === 'student' ? 'ent!A2:E' : 'ent!A2:E';
        console.log('RANGE set to:', RANGE);
        loadEntryData();
    } catch (error) {
        console.error('Error loading user type:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
});

async function getUserType() {
    const response = await fetch('/api/get-user-type');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const { userType } = await response.json();
    return userType;
}

async function loadEntryData() {
    try {
        const response = await fetch('/api/get-entry-data');
        if (!response.ok) {
            throw new Error(`Error fetching entry data: ${response.status}`);
        }
        const data = await response.json();

        console.log('Entry data loaded:', data);
        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading entry data', error);
        displayErrorMessage("Entry 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        console.log(row);
        const [name, url, ctElement, imgURL] = row;
        const baseName = name.trim();
        projects[baseName] = { ctElement: ctElement, url: url, imgURL: imgURL || '' };
    });
    console.log('Grouped Projects:', projects);
    return projects;
}

function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';

    Object.keys(projects).forEach(projectName => {
        if (projectName === '새로 시작하기') return;

        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card h-100">
                <img src="${project.imgURL}" class="card-img-top" alt="Project Image">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text"><i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}</p>
                    <a href="${project.url}" class="btn btn-primary" target="_blank">프로젝트 시작</a>
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
