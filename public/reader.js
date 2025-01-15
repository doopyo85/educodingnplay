function checkLibraries() {
    if (typeof $ === 'undefined') {
        console.error('jQuery가 로드되지 않았습니다.');
        return false;
    }
    if (typeof $.fn.turn === 'undefined') {
        console.error('Turn.js가 로드되지 않았습니다.');
        return false;
    }
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js가 로드되지 않았습니다.');
        return false;
    }
    console.log('모든 라이브러리가 성공적으로 로드되었습니다.');
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!checkLibraries()) {
        console.error('필요한 라이브러리가 로드되지 않았습니다.');
        return;
    }
    initializeReader();
});

function initializeReader() {
    console.log('Initializing reader');
    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdfUrl');

    if (pdfUrl) {
        console.log('PDF URL:', pdfUrl);
        loadPDFInFlipbook(pdfUrl);
    } else {
        console.error('PDF URL이 제공되지 않았습니다.');
        document.getElementById('flipbook').innerHTML = `<div class="alert alert-warning" role="alert">PDF URL이 제공되지 않았습니다.</div>`;
    }
}

function loadPDFInFlipbook(pdfUrl) {
    console.log('Loading PDF:', pdfUrl);
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '<div class="loading">Loading PDF...</div>';

    // PDF 이름 표시
    const pdfName = decodeURIComponent(pdfUrl.split('/').pop());
    document.getElementById('pdf-name').textContent = pdfName;

    pdfjsLib.getDocument(pdfUrl).promise
        .then(pdfDoc => {
            console.log('PDF loaded. Number of pages:', pdfDoc.numPages);
            flipbook.innerHTML = '';

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                const pageElement = document.createElement('div');
                pageElement.className = 'page';
                pageElement.innerHTML = `<div class="loader">Loading page ${pageNum}</div>`;
                flipbook.appendChild(pageElement);

                pdfDoc.getPage(pageNum).then(page => {
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    page.render(renderContext).promise.then(() => {
                        pageElement.innerHTML = '';
                        pageElement.appendChild(canvas);
                        console.log(`Page ${pageNum} rendered`);
                    });
                });
            }

            $(flipbook).turn({
                width: 1000,
                height: 600,
                autoCenter: true,
                acceleration: true,
                gradients: true,
                elevation: 50,
                when: {
                    turning: function(event, page, view) {
                        console.log('Turning to page', page);
                    }
                }
            });

            console.log('Flipbook initialized');
        })
        .catch(error => {
            console.error('Error loading PDF:', error);
            flipbook.innerHTML = `<div class="alert alert-danger" role="alert">PDF를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
        });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeReader);