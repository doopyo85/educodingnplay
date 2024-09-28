document.addEventListener("DOMContentLoaded", async function() {
    try {
        await loadEntryData();
    } catch (error) {
        console.error('Error loading entry data:', error);
        displayErrorMessage("Entry 데이터를 불러오는 중 오류가 발생했습니다.");
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
        const response = await fetch('/api/get-ent-data');
        if (!response.ok) {
            throw new Error(`Error fetching entry data: ${response.status}`);
        }
        const data = await response.json();

        if (data && data.length > 0) {
            const projects = groupByCategory(data);
            displayTabsAndProjects(projects);
        } else {
            throw new Error("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading entry data', error);
        displayErrorMessage(error.message);
    }
}

function groupByCategory(data) {
    const projects = {};
    data.forEach(row => {
        const [category, name, entURL, ctElement, imgURL] = row;
        if (!projects[category]) {
            projects[category] = [];
        }
        projects[category].push({ name, entURL, ctElement, imgURL });
    });
    return projects;
}

function displayTabsAndProjects(projects) {
    const tabsContainer = document.getElementById('categoryTabs');
    const contentContainer = document.getElementById('content-container');
    
    if (!tabsContainer || !contentContainer) {
        console.error('Required DOM elements not found');
        displayErrorMessage("페이지 로딩 중 오류가 발생했습니다.");
        return;
    }

    let firstTab = true;

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    Object.keys(projects).forEach((category, index) => {
        const tabId = `tab-${index}`;
        const paneId = `pane-${index}`;

        const tab = document.createElement('li');
        tab.className = 'nav-item';
        tab.innerHTML = `
            <button class="nav-link ${firstTab ? 'active' : ''}" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${paneId}" type="button" role="tab" aria-controls="${paneId}" aria-selected="${firstTab}">
                ${category}
            </button>
        `;
        tabsContainer.appendChild(tab);

        const tabContent = document.createElement('div');
        tabContent.className = `tab-pane fade ${firstTab ? 'show active' : ''}`;
        tabContent.id = paneId;
        tabContent.role = 'tabpanel';
        tabContent.setAttribute('aria-labelledby', tabId);

        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        projects[category].forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

            const cardContent = `
                <div class="card h-100">
                    <img src="${sanitizeURL(project.imgURL)}" class="card-img-top" alt="${escapeHTML(project.name)}" onerror="this.src='/path/to/default/image.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHTML(project.name)}</h5>
                        <p class="card-text"><i class="bi bi-cpu"></i> C.T 학습 요소: ${escapeHTML(project.ctElement || '정보 없음')}</p>
                        <a href="${sanitizeURL(project.entURL)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">프로젝트 시작</a>
                    </div>
                </div>
            `;
            card.innerHTML = cardContent;
            rowDiv.appendChild(card);
        });

        tabContent.appendChild(rowDiv);
        contentContainer.appendChild(tabContent);

        firstTab = false;
    });
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