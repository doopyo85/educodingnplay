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

    // PDF.js 웹 워커 비활성화
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;

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
            if (typeof $.fn.turn !== 'undefined') {
                $(flipbook).turn({
                    width: 800,
                    height: 600,
                    autoCenter: true
                });
            } else {
                console.error("Turn.js가 로드되지 않았습니다.");
                displayErrorMessage("Flipbook을 사용할 수 없습니다.");
            }
        });
    }).catch(error => {
        console.error("PDF를 로드하는 중 오류가 발생했습니다: ", error);
        displayErrorMessage("PDF를 로드하는 중 오류가 발생했습니다.");
    });
}

// 오류 메시지를 출력하는 함수
function displayErrorMessage(message) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
