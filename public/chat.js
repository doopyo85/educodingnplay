document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const inputField = document.getElementById('chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    fetch('/board/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: message })
    })
    .then(response => {
        if (response.ok) {
            inputField.value = '';
            location.reload();
        }
    })
    .catch(error => console.error('채팅 전송 에러:', error));
}
