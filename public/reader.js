// pdf.js와 turn.js는 CDN으로 로드된다고 가정합니다.

document.addEventListener("DOMContentLoaded", function() {
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js가 로드되지 않았습니다.');
        displayErrorMessage("PDF.js를 로드할 수 없습니다.");
        return;
    }

    if (typeof $.fn.turn === 'undefined') {
        console.error('Turn.js가 로드되지 않았습니다.');
        displayErrorMessage("Turn.js를 로드할 수 없습니다.");
        return;
    }

    // PDF.js 워커 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdfUrl');
    if (pdfUrl) {
        loadPDFInFlipbook(pdfUrl);
    } else {
        displayErrorMessage("PDF URL이 없습니다.");
    }
});

function loadPDFInFlipbook(pdfUrl) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';

    pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc => {
        let promises = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            promises.push(pdfDoc.getPage(pageNum).then(page => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                return page.render({ canvasContext: context, viewport: viewport }).promise.then(() => {
                    flipbook.appendChild(canvas);
                });
            }));
        }

        Promise.all(promises).then(() => {
            $(flipbook).turn({
                width: 800,
                height: 600,
                autoCenter: true
            });
        });
    }).catch(error => {
        console.error("PDF를 로드하는 중 오류가 발생했습니다: ", error);
        displayErrorMessage("PDF를 로드하는 중 오류가 발생했습니다.");
    });
}

function displayErrorMessage(message) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}