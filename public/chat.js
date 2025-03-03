// 메시지 전송 함수 (버튼 클릭 & 엔터 입력 공통 처리)
async function sendMessage() {
    const inputField = document.getElementById("chat-input");
    const message = inputField.value.trim();
    if (!message) return;

    try {
        const response = await fetch("/board/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: message })
        });

        // 응답이 JSON인지 먼저 확인
        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (response.status === 403) {
            if (isJson) {
                const data = await response.json();
                alert(data.error || "로그인이 필요합니다.");
            } else {
                alert("로그인이 필요합니다.");
            }
            return;
        }

        if (!response.ok) {
            if (isJson) {
                const data = await response.json();
                alert(data.error || "게시글 작성 중 오류 발생");
            } else {
                alert("서버 오류 발생");
            }
            return;
        }

        // 성공 시 입력 필드 초기화 & 새로고침
        inputField.value = "";
        location.reload();
    } catch (error) {
        console.error("게시글 작성 오류:", error);
        alert("네트워크 오류가 발생했습니다.");
    }
}

// "보내기" 버튼 클릭 이벤트
document.getElementById("send-btn").addEventListener("click", sendMessage);

// 엔터 키 입력 이벤트
document.getElementById("chat-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
