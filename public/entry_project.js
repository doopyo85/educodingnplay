let RANGE;

document.addEventListener("DOMContentLoaded", async function() {
    try {
        const userType = await getUserType();
        RANGE = userType === 'student' ? 'ent!A2:E' : 'ent!A2:F'; // 교사용 범위를 다르게 설정
        await loadEntryData();
    } catch (error) {
        console.error('Error initializing:', error);
        displayErrorMessage("초기 설정을 불러오는 중 오류가 발생했습니다.");
    }
});

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
        throw error;
    }
}

async function loadEntryData() {
    try {
        const response = await fetch('/api/get-ent-data'); // 수정된 API 엔드포인트
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('데이터를 찾을 수 없습니다.');
            } else {
                throw new Error(`서버 오류: ${response.status}`);
            }
        }
        const data = await response.json();

        if (data && data.length > 0) {
            const projects = groupByProject(data);
            displayProjects(projects);
        } else {
            throw new Error("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading entry data:', error);
        displayErrorMessage(error.message);
    }
}

function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        const [name, url, ctElement, imgURL] = row;
        const baseName = name.trim();
        projects[baseName] = { 
            ctElement: ctElement || '정보 없음', 
            url: sanitizeURL(url), 
            imgURL: sanitizeURL(imgURL) || '/path/to/default/image.jpg'
        };
    });
    return projects;
}

function sanitizeURL(url) {
    // 기본적인 URL 검증
    if (!url) return '';
    try {
        new URL(url);
        return url;
    } catch {
        console.warn('Invalid URL:', url);
        return '';
    }
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
                <img src="${project.imgURL}" class="card-img-top" alt="Project Image" onerror="this.src='/path/to/default/image.jpg'">
                <div class="card-body">
                    <h5 class="card-title">${escapeHTML(projectName)}</h5>
                    <p class="card-text"><i class="bi bi-cpu"></i> C.T 학습 요소: ${escapeHTML(project.ctElement)}</p>
                    ${project.url ? `<a href="${project.url}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">프로젝트 시작</a>` : ''}
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${escapeHTML(message)}</div>`;
}