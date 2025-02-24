document.addEventListener("DOMContentLoaded", async function() {
    try {
        console.log("📢 업무 리스트 로드 시작...");
        await loadTaskData();
    } catch (error) {
        console.error("❌ 업무 리스트 불러오기 실패:", error);
        displayTaskErrorMessage("업무 데이터를 불러오는 중 오류가 발생했습니다.");
    }
});

async function loadTaskData() {
    try {
        const response = await fetch('/api/get-task-data'); // 서버에서 구글시트 데이터를 가져옴
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }
        const data = await response.json();

        if (!data || !data.length) {
            throw new Error("구글시트에서 데이터를 가져올 수 없습니다.");
        }

        const tasks = processTaskData(data);
        displayTasks(tasks);
    } catch (error) {
        console.error("❌ 업무 데이터 로드 오류:", error);
        displayTaskErrorMessage("업무 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

function processTaskData(data) {
    return data.map(row => {
        const [name, comment, progress] = row;
        let progressValue = parseInt(progress?.replace('%', '').trim()) || 0;

        return {
            name: name || "이름 없음",
            comment: comment || "설명 없음",
            progress: progressValue
        };
    });
}

function displayTasks(tasks) {
    const taskList = document.getElementById("task-list");
    taskList.innerHTML = "";

    tasks.forEach(task => {
        const taskCard = `
            <div class="task-card">
                <div class="task-info">
                    <div class="task-name">${task.name}</div>
                    <div class="task-comment">${task.comment}</div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${task.progress}%;"></div>
                    </div>
                </div>
                <button class="like-btn"><i class="bi bi-heart"></i></button>
            </div>
        `;
        taskList.innerHTML += taskCard;
    });
}

function displayTaskErrorMessage(message) {
    const taskList = document.getElementById("task-list");
    taskList.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">오류 발생</h4>
            <p>${message}</p>
        </div>
    `;
}
