document.addEventListener("DOMContentLoaded", async function() {
    loadBookData();  // 책 데이터를 로드
});

// 책 데이터를 불러오는 함수
async function loadBookData() {
    try {
        // API 호출로 구글 시트에서 책 데이터를 가져옴
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
                    <button class="btn btn-primary load-pdf" data-url="${pdfUrl}">보기</button>
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // PDF 보기 버튼 클릭 이벤트 리스너 추가
    document.querySelectorAll('.load-pdf').forEach(button => {
        button.addEventListener('click', function() {
            const pdfUrl = this.getAttribute('data-url');
            loadPDFInFlipbook(pdfUrl);  // PDF를 Flipbook으로 로드
        });
    });
}

// PDF를 Flipbook으로 로드하는 함수
function loadPDFInFlipbook(pdfUrl) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';  // 기존 내용을 초기화

    pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc => {
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            pdfDoc.getPage(pageNum).then(page => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                page.render(renderContext).promise.then(() => {
                    flipbook.appendChild(canvas);  // Flipbook에 페이지 추가
                });
            });
        }

        // Turn.js로 Flipbook 기능 활성화
        $("#flipbook").turn({
            width: 800,
            height: 600,
            autoCenter: true
        });
    });
}

// 오류 메시지를 출력하는 함수
function displayErrorMessage(message) {
    const container = document.getElementById('book-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
