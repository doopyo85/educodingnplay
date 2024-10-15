document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdfUrl');  // 쿼리 파라미터에서 PDF URL을 가져옴
    if (pdfUrl) {
        loadPDFInFlipbook(pdfUrl);  // PDF를 Flipbook으로 로드
    } else {
        displayErrorMessage("PDF URL이 없습니다.");
    }
});

// PDF를 Flipbook으로 로드하는 함수
function loadPDFInFlipbook(pdfUrl) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';  // 기존 내용을 초기화

    pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc => {
        let promises = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            promises.push(pdfDoc.getPage(pageNum).then(page => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                return page.render(renderContext).promise.then(() => {
                    flipbook.appendChild(canvas);  // Flipbook에 페이지 추가
                });
            }));
        }

        // 모든 페이지가 렌더링된 후 Flipbook 초기화
        Promise.all(promises).then(() => {
            $(flipbook).turn({
                width: 800,
                height: 600,
                autoCenter: true
            });
        });
    });
}

// 오류 메시지를 출력하는 함수
function displayErrorMessage(message) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
