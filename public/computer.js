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
