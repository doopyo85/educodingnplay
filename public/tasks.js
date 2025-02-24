document.addEventListener("DOMContentLoaded", loadTasks);

function loadTasks() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const apiKey = document.getElementById("googleApiKey").value;
    const range = "Tasks!A2:C10"; // 업무 리스트 범위

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            const tasks = data.values || [];
            const taskList = document.getElementById("task-list");
            taskList.innerHTML = "";

            tasks.forEach(task => {
                const [name, progress] = task;
                const taskCard = `
                    <div class="task-card">
                        <div class="task-info">
                            <div class="task-name">${name}</div>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${progress}%;"></div>
                            </div>
                        </div>
                        <button class="like-btn"><i class="bi bi-heart"></i></button>
                    </div>
                `;
                taskList.innerHTML += taskCard;
            });
        })
        .catch(error => console.error("업무 리스트 불러오기 실패:", error));
}
