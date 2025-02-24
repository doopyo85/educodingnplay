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
                const [name, comment, progress] = task;

                // 진행도 값이 없거나 숫자가 아니면 기본값 0% 설정
                let progressValue = 0;
                if (progress) {
                    progressValue = parseInt(progress.replace('%', '').trim()) || 0;
                }

                const taskCard = `
                    <div class="task-card">
                        <div class="task-info">
                            <div class="task-name">${name}</div>
                            <div class="task-comment">${comment || "설명 없음"}</div>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${progressValue}%;"></div>
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
