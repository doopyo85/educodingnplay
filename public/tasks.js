document.addEventListener("DOMContentLoaded", async function() {
    try {
        await loadTaskData();
    } catch (error) {
        console.error('업무 데이터 로드 오류:', error);
        displayTaskErrorMessage("업무 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

async function loadTaskData() {
    try {
        const response = await fetch('/api/get-task-data'); // 📌 엔드포인트 수정 필요
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
        }

        const taskData = await response.json();
        if (taskData && taskData.length > 0) {
            displayTasks(taskData);
        } else {
            displayTaskErrorMessage("업무 데이터가 없습니다.");
        }
    } catch (error) {
        console.error('업무 리스트 불러오기 실패:', error);
        displayTaskErrorMessage("업무 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function displayTasks(tasks) {
    const container = document.getElementById('task-list');
    container.innerHTML = '';

    tasks.forEach(task => {
        if (!Array.isArray(task) || task.length < 3) return;
        const [taskName, comment, progress] = task;

        const card = document.createElement('div');
        card.className = 'task-card';

        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${taskName}</h5>
                <p class="card-text">${comment || '설명이 없습니다.'}</p>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${progress || 0}%" aria-valuenow="${progress || 0}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function displayTaskErrorMessage(message) {
    const container = document.getElementById('task-list');
    container.innerHTML = `<div class="alert alert-danger">${message}</div>`;
}
