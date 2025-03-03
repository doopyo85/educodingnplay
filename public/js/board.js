/**
 * public/js/board.js
 * 게시판 기능 관련 클라이언트 로직
 */

// DOM이 로드된 후 실행
document.addEventListener("DOMContentLoaded", function() {
    // 메시지 전송 버튼 이벤트 연결
    document.getElementById("send-btn").addEventListener("click", sendMessage);
    
    // 입력 필드 엔터키 이벤트 연결
    document.getElementById("chat-input").addEventListener("keypress", function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // 삭제 버튼들에 이벤트 리스너 추가
    setupDeleteButtons();
});

// 삭제 버튼 이벤트 설정
function setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            
            if (confirm('이 글을 정말 삭제하시겠습니까?')) {
                const deleteUrl = this.getAttribute('href');
                
                // AJAX로 삭제 요청 보내기
                fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (response.ok) {
                        // 삭제 성공 시 화면에서 메시지 요소 제거
                        const messageContainer = this.closest('.message-container');
                        if (messageContainer) {
                            messageContainer.remove();
                        } else {
                            // 요소를 찾지 못한 경우 페이지 새로고침
                            location.reload();
                        }
                    } else if (response.status === 403) {
                        alert('삭제 권한이 없습니다.');
                    } else {
                        alert('삭제 중 오류가 발생했습니다.');
                        console.error('삭제 실패:', response.status);
                    }
                })
                .catch(error => {
                    console.error('삭제 요청 오류:', error);
                    alert('네트워크 오류가 발생했습니다.');
                });
            }
        });
    });
}

// 메시지 전송 함수
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

        // 응답이 JSON인지 확인
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