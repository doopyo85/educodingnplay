let RANGE = 'computer!A2:E'; // Range for fetching data from Google Sheets

document.addEventListener("DOMContentLoaded", async function() {
    try {
        loadComputerData(); // Load computer-related data immediately
    } catch (error) {
        console.error('Error loading computer data:', error);
        displayErrorMessage("컴퓨터 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

// Function to fetch the computer data
async function loadComputerData() {
    try {
        const data = await fetch('/api/get-computer-data').then(res => res.json());
        if (data && data.length > 0) {
            const projects = groupByCategory(data);
            displayProjects(projects);  // Display the projects in HTML
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading computer data', error);
        displayErrorMessage("컴퓨터 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// Group data by categories like "컴퓨터활용", "마인크래프트", "블록리게임"
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

// Display the grouped projects on the page
function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; // Clear existing content

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

// Function to display error messages
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}


// Sample data from Google Sheets (A:E columns)
const data = [
    { category: '컴퓨터활용', title: '마우스 클릭연습(기초)', description: '처음 컴퓨터를 배우는 친구들에게 클릭과 드래그를 훈련시킬 수 있어요', url: 'https://studio.code.org/s/pre-express-2022/lessons/1/levels/1', img: 'https://code.org/images/pre-reader-express-course-banner.png' },
    { category: '컴퓨터활용', title: '마우스 클릭연습(블럭)', description: '블럭에 속성을 입력하여 알맞게 코딩해보세요', url: 'https://blockly.games/puzzle?lang=ko', img: 'https://blockly.games/index/puzzle.png' },
    { category: '컴퓨터활용', title: '타자연습', description: '키보드 사용법을 익히고, 한글/영어 타자 실력을 기르세요', url: 'https://tt.hancomtaja.com/ko?pr=SW', img: 'https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com/taja.webp' },
    { category: '마인크래프트', title: '수중세계 탐험', description: '수중 세계를 탐험하며 문제 해결 능력을 발휘해보세요.', url: 'https://studio.code.org/s/aquatic/lessons/1/levels/1', img: 'https://code.org/images/mc/minecraft-activity-aquatic.png' },
    { category: '마인크래프트', title: '히어로의 여정', description: '에이전트에게 명령을 내리고 장애물을 극복하세요', url: 'https://studio.code.org/s/hero/lessons/1/levels/1', img: 'https://code.org/images/mc/minecraft-activity-journey.png' },
    { category: '마인크래프트', title: '어드벤처러', description: '코드를 작성해 마인크래프트 세계를 탐험하세요.', url: 'https://studio.code.org/s/mc/lessons/1/levels/1', img: 'https://code.org/images/mc/minecraft-activity-adventurer.png' },
    { category: '마인크래프트', title: '디자이너', description: '기본 코딩을 배우고 자신만의 마인크래프트 게임을 만드세요.', url: 'https://studio.code.org/s/minecraft/lessons/1/levels/1', img: 'https://code.org/images/mc/minecraft-activity-designer.png' },
    { category: '블록리게임', title: '미로', description: 'while 조건문을 활용해 자동길찾기 로직을 완성해보세요', url: 'https://blockly.games/maze?lang=ko', img: 'https://blockly.games/index/maze.png' },
    { category: '블록리게임', title: '새', description: '각도와 조건문을 활용해 새가 먹이를 찾아 둥지까지 가도록 코딩해보세요', url: 'https://blockly.games/bird?lang=ko', img: 'https://blockly.games/index/bird.png' },
    { category: '블록리게임', title: '거북이', description: '각도와 반복문을 활용해 도형그리기를 완성해보세요', url: 'https://blockly.games/turtle?lang=ko', img: 'https://blockly.games/index/turtle.png' }
];

    
    // Function to generate card HTML
    function createCard(item) {
        return `
            <div class="col-md-3 mb-4">
                <div class="card h-100">
                    <img src="${item.img}" class="card-img-top" alt="${item.title}">
                    <div class="card-body">
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">${item.description}</p>
                        <a href="${item.url}" class="btn btn-primary">시작하기</a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Function to render cards by category
    function renderCards(category, containerId) {
        const container = document.getElementById(containerId);
        const filteredData = data.filter(item => item.category === category);
        container.innerHTML = filteredData.map(createCard).join('');
    }
    
    // Render cards for each category on page load
    document.addEventListener('DOMContentLoaded', function () {
        renderCards('컴퓨터활용', 'computer-cards');
        renderCards('마인크래프트', 'minecraft-cards');
        renderCards('블록리게임', 'blockly-cards');
    });
    