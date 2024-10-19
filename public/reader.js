// 라이브러리 로딩 확인
function checkLibraries() {
    const libraries = {
        'jQuery': $,
        'Turn.js': $.fn.turn,
        'PDF.js': pdfjsLib
    };

    for (const [name, lib] of Object.entries(libraries)) {
        if (typeof lib === 'undefined') {
            console.error(`${name}가 로드되지 않았습니다.`);
            return false;
        }
        console.log(`${name} loaded successfully`);
    }

    return true;
}

function initializeTurn(flipbook) {
    $(flipbook).turn({
        width: 800,
        height: 600,
        autoCenter: true
    });
}

function loadPDFInFlipbook(pdfUrl) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';

    pdfjsLib.getDocument(pdfUrl).promise
        .then(pdfDoc => {
            const promises = [];

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                promises.push(
                    pdfDoc.getPage(pageNum).then(page => {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        const viewport = page.getViewport({ scale: 1.5 });

                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        return page.render({ canvasContext: context, viewport: viewport }).promise
                            .then(() => {
                                flipbook.appendChild(canvas);
                            });
                    })
                );
            }

            return Promise.all(promises);
        })
        .then(() => {
            initializeTurn(flipbook);
        })
        .catch(error => {
            console.error("PDF를 로드하는 중 오류가 발생했습니다: ", error);
            flipbook.innerHTML = `<div class="alert alert-danger" role="alert">PDF를 로드하는 중 오류가 발생했습니다.</div>`;
        });
}

document.addEventListener("DOMContentLoaded", function() {
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
});