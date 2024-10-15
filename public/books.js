document.addEventListener("DOMContentLoaded", async function() {
    loadBookData();  // 책 데이터를 로드
});

// 책 데이터를 불러오는 함수
async function loadBookData() {
    try {
        const data = await fetch('/api/get-books-data').then(res => res.json());
        if (data && data.length > 0) {
            displayBooks(data);  // 책 목록을 화면에 출력
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('Error loading book data', error);
        displayErrorMessage("책 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// 책 목록을 화면에 출력하는 함수
function displayBooks(data) {
    const container = document.getElementById('book-container');
    container.innerHTML = '';  // 기존 내용을 비움

    data.forEach(row => {
        const [category, title, pdfUrl, thumbnailUrl, ctElement] = row;
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card">
                <img src="${thumbnailUrl}" class="card-img-top" alt="${title}">
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    <p class="card-text">카테고리: ${category}</p>
                    <p class="card-text">C.T 요소: ${ctElement}</p>
                    <a href="/reader?pdfUrl=${encodeURIComponent(pdfUrl)}" class="btn btn-primary">보기</a>  <!-- reader 페이지로 이동 -->
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });
}

// 오류 메시지를 출력하는 함수
function displayErrorMessage(message) {
    const container = document.getElementById('book-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
