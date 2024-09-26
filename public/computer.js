document.addEventListener("DOMContentLoaded", async function() {
    try {
        await loadComputerData(); // 컴퓨터 데이터를 로드
    } catch (error) {
        console.error('Error loading computer data:', error);
        displayErrorMessage("컴퓨터 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

// 서버 API를 통해 컴퓨터 데이터를 가져오는 함수
async function loadComputerData() {
    try {
        const data = await fetch('/api/get-computer-data')  // 서버의 API 호출
            .then(res => res.json());
        
        if (data && data.length > 0) {
            const projects = groupByCategory(data);
            displayProjects(projects); // HTML에 프로젝트 데이터 표시
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading computer data', error);
        displayErrorMessage("컴퓨터 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// 데이터를 카테고리별로 그룹화하는 함수 (변경 없음)
function groupByCategory(data) {
    const projects = {};
    data.forEach(row => {
        const [category, name, description, stageURL, imgURL] = row;
        if (!projects[category]) {
            projects[category] = [];
        }
        projects[category].push({ name, description, stageURL, imgURL });
    });
    return projects;
}

// HTML에 프로젝트 데이터를 표시하는 함수 (변경 없음)
function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; // 기존 내용을 지우고 새로 표시

    Object.keys(projects).forEach(category => {
        const categoryHeader = document.createElement('h2');
        categoryHeader.textContent = category;
        container.appendChild(categoryHeader);

        const row = document.createElement('div');
        row.className = 'row';

        projects[category].forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

            const cardContent = `
                <div class="card h-100">
                    <img src="${project.imgURL}" class="card-img-top" alt="${project.name}">
                    <div class="card-body">
                        <h5 class="card-title">${project.name}</h5>
                        <p class="card-text">${project.description}</p>
                        <a href="${project.stageURL}" class="btn btn-primary">시작하기</a>
                    </div>
                </div>
            `;
            card.innerHTML = cardContent;
            row.appendChild(card);
        });

        container.appendChild(row);
    });
}

// 오류 메시지를 표시하는 함수 (변경 없음)
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
