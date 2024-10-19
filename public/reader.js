// 라이브러리 로딩 확인
function checkLibraries() {
    const libraries = {
        'jQuery': typeof jQuery !== 'undefined',
        'Turn.js': typeof jQuery !== 'undefined' && typeof jQuery.fn.turn !== 'undefined',
        'PDF.js': typeof pdfjsLib !== 'undefined'
    };

    for (const [name, loaded] of Object.entries(libraries)) {
        if (!loaded) {
            console.error(`${name}가 로드되지 않았습니다.`);
            return false;
        }
        console.log(`${name} loaded successfully`);
    }

    return true;
}

function loadPDFInFlipbook(pdfUrl) {
    console.log('Attempting to load PDF:', pdfUrl);
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';

    // PDF.js 워커 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    pdfjsLib.getDocument(pdfUrl).promise
        .then(pdfDoc => {
            console.log('PDF loaded successfully. Number of pages:', pdfDoc.numPages);
            const promises = [];

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                promises.push(
                    pdfDoc.getPage(pageNum).then(page => {
                        console.log('Rendering page', pageNum);
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.5 });

                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        return page.render({ canvasContext: context, viewport: viewport }).promise
                            .then(() => {
                                flipbook.appendChild(canvas);
                                console.log('Page', pageNum, 'rendered and added to flipbook');
                            });
                    })
                );
            }

            return Promise.all(promises);
        })
        .then(() => {
            console.log('All pages rendered. Initializing Turn.js');
            initializeTurn(flipbook);
        })
        .catch(error => {
            console.error("PDF를 로드하는 중 오류가 발생했습니다: ", error);
            flipbook.innerHTML = `<div class="alert alert-danger" role="alert">PDF를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
        });
}

function initializeTurn(flipbook) {
    console.log('Initializing Turn.js');
    try {
        jQuery(flipbook).turn({
            width: 800,
            height: 600,
            autoCenter: true
        });
        console.log('Turn.js initialized successfully');
    } catch (error) {
        console.error('Error initializing Turn.js:', error);
    }
}


function initializeReader() {
    console.log('DOMContentLoaded event fired');

    if (!checkLibraries()) {
        console.error('필요한 라이브러리가 로드되지 않았습니다.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pdfUrl = urlParams.get('pdfUrl');

    if (pdfUrl) {
        loadPDFInFlipbook(pdfUrl);
    } else {
        console.error('PDF URL이 제공되지 않았습니다.');
        document.getElementById('flipbook').innerHTML = `<div class="alert alert-warning" role="alert">PDF URL이 제공되지 않았습니다.</div>`;
    }
}

// 스크립트가 비동기적으로 로드되므로, DOMContentLoaded 이벤트 대신 즉시 실행
initializeReader();