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
        const response = await fetch('/api/get-task-data'); // 기존 방식과 동일한 엔드포인트 사용
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data)) {
            throw new Error("잘못된 데이터 형식입니다.");
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
