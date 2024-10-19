console.log('reader.js loaded');

document.addEventListener("DOMContentLoaded", function() {
    console.log('DOMContentLoaded event fired');

    if (typeof $ === 'undefined') {
        console.error('jQuery가 로드되지 않았습니다.');
        return;
    }
    console.log('jQuery loaded successfully');

    if (typeof $.fn.turn === 'undefined') {
        console.error('Turn.js가 로드되지 않았습니다.');
        return;
    }
    console.log('Turn.js loaded successfully');

    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js가 로드되지 않았습니다.');
        return;
    }
    console.log('PDF.js loaded successfully');

    // Turn.js 초기화
    $("#flipbook").turn({
        width: 800,
        height: 600,
        autoCenter: true
    });
    console.log('All libraries loaded successfully');
    
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