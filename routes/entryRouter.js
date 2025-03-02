// routes/entryRouter.js
const express = require('express');
const router = express.Router();

// Entry 메인 페이지 라우트
router.get('/', (req, res) => {
    try {
        console.log('Entry Router: 요청 받음');
        console.log('쿼리 파라미터:', req.query);
        
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        const fileName = projectFile.split('/').pop(); // 파일 이름 추출
        
        // 안내 페이지 제공 - 자동 리다이렉트 제거
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Entry 프로젝트</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    margin-top: 50px;
                    background-color: #f5f5f5;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background-color: white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .button {
                    background-color: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                    text-decoration: none;
                    display: inline-block;
                }
                .button.secondary {
                    background-color: #ccc;
                }
                .instructions {
                    text-align: left;
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 4px;
                    border-left: 4px solid #4CAF50;
                }
                ol {
                    margin-left: 20px;
                }
                .step {
                    margin-bottom: 10px;
                }
                h2 {
                    color: #333;
                }
                .note {
                    font-size: 14px;
                    color: #666;
                    margin-top: 20px;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${projectFile ? `
                <h2>엔트리 프로젝트 로드</h2>
                <div class="instructions">
                    <h3>프로젝트 파일 불러오는 방법:</h3>
                    <ol>
                        <li class="step">
                            <strong>프로젝트 파일 다운로드</strong> 버튼을 클릭하여 프로젝트 파일(<strong>${fileName}</strong>)을 다운로드합니다.
                        </li>
                        <li class="step">
                            <strong>Entry Studio 열기</strong> 버튼을 클릭하여 엔트리 스튜디오를 새 창에서 엽니다.
                        </li>
                        <li class="step">
                            Entry Studio에서 상단 메뉴에서 <strong>불러오기</strong> 버튼을 클릭합니다.
                        </li>
                        <li class="step">
                            <strong>파일 선택</strong> 버튼을 클릭하고 다운로드한 프로젝트 파일을 선택합니다.
                        </li>
                    </ol>
                </div>
                <a href="${projectFile}" download="${fileName}" class="button" id="downloadBtn">프로젝트 파일 다운로드</a>
                <a href="https://playentry.org/ws" target="_blank" class="button">Entry Studio 열기</a>
                <p class="note">참고: Entry Studio는 외부 URL에서 직접 프로젝트를 불러오는 기능을 제한하고 있습니다.</p>
                ` : `
                <h2>엔트리 스튜디오</h2>
                <p>아래 버튼을 클릭하여 새 프로젝트를 시작하세요.</p>
                <a href="https://playentry.org/ws" target="_blank" class="button">새 프로젝트 시작하기</a>
                `}
                <a href="/entry_project" class="button secondary">프로젝트 목록으로 돌아가기</a>
            </div>
            
            <script>
                // 다운로드 버튼 클릭 여부 추적
                document.addEventListener('DOMContentLoaded', function() {
                    var downloadBtn = document.getElementById('downloadBtn');
                    if (downloadBtn) {
                        downloadBtn.addEventListener('click', function() {
                            // 다운로드 버튼 클릭 시 로그 기록
                            console.log('프로젝트 파일 다운로드 버튼 클릭됨');
                            
                            // 작은 딜레이 후 다운로드 시작
                            setTimeout(function() {
                                var link = document.createElement('a');
                                link.href = '${projectFile}';
                                link.download = '${fileName}';
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }, 100);
                        });
                    }
                });
            </script>
        </body>
        </html>
        `;
        
        // 응답 헤더 설정
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.send(html);
        
        // 로그 기록
        console.log(`사용자 ${req.session?.userID || '익명'} Entry 워크스페이스 접근, 프로젝트: ${projectFile}`);
    } catch (error) {
        console.error('Entry 워크스페이스 페이지 생성 오류:', error);
        res.status(500).send('Entry 워크스페이스 페이지를 생성하는 중 오류가 발생했습니다.');
    }
});

// 프로젝트 파일 다운로드를 위한 추가 라우트
router.get('/download', (req, res) => {
    try {
        const projectFile = req.query.url || '';
        if (!projectFile) {
            return res.status(400).send('다운로드할 파일 URL이 지정되지 않았습니다.');
        }
        
        // 파일 이름 추출
        const fileName = projectFile.split('/').pop();
        
        // 리다이렉트로 다운로드
        res.redirect(projectFile);
        
        console.log(`사용자 ${req.session?.userID || '익명'} 프로젝트 파일 다운로드: ${fileName}`);
    } catch (error) {
        console.error('파일 다운로드 오류:', error);
        res.status(500).send('파일 다운로드 중 오류가 발생했습니다.');
    }
});

module.exports = router;