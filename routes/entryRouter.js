// routes/entryRouter.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Entry 메인 페이지 라우트
router.get('/', async (req, res) => {
    try {
        console.log('Entry Router: 요청 받음');
        console.log('쿼리 파라미터:', req.query);
        
        // 프로젝트 파일 URL이 쿼리 파라미터로 제공되었는지 확인
        const projectFile = req.query.project_file || '';
        
        if (projectFile) {
            // 프로젝트 파일을 다운로드하여 데이터 추출
            try {
                // 임시 파일 경로 생성
                const tempDir = path.join(__dirname, '../temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                const fileName = path.basename(projectFile);
                const filePath = path.join(tempDir, fileName);
                
                // 파일 다운로드
                console.log('프로젝트 파일 다운로드 시도:', projectFile);
                const response = await axios.get(projectFile, { responseType: 'arraybuffer' });
                fs.writeFileSync(filePath, response.data);
                
                console.log('파일 다운로드 완료:', filePath);
                
                // 파일 내용을 base64로 인코딩
                const fileContent = fs.readFileSync(filePath);
                const base64Content = Buffer.from(fileContent).toString('base64');
                
                // URL에 데이터를 직접 포함시키는 대신, 사용자에게 파일 업로드 페이지 제공
                const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Entry 프로젝트 로드</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            margin-top: 50px;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
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
                        }
                        .instructions {
                            text-align: left;
                            margin: 20px 0;
                            padding: 10px;
                            background-color: #f9f9f9;
                            border-radius: 4px;
                        }
                        ol {
                            margin-left: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Entry 프로젝트 로드 방법</h2>
                        <p>Entry Studio는 외부 URL에서 직접 프로젝트 파일을 로드하는 기능을 제한하고 있습니다.</p>
                        
                        <div class="instructions">
                            <h3>프로젝트 파일 로드 방법:</h3>
                            <ol>
                                <li>아래 버튼을 클릭하여 Entry Studio를 엽니다.</li>
                                <li>Entry Studio에서 [불러오기] 버튼을 클릭합니다.</li>
                                <li>아래 [프로젝트 파일 다운로드] 버튼을 클릭하여 파일을 다운로드합니다.</li>
                                <li>다운로드된 파일을 Entry Studio에 업로드합니다.</li>
                            </ol>
                        </div>
                        
                        <a href="https://playentry.org/ws" target="_blank" class="button">Entry Studio 열기</a>
                        <a href="${projectFile}" download="${fileName}" class="button">프로젝트 파일 다운로드</a>
                        <button onclick="window.history.back()" class="button" style="background-color: #ccc;">뒤로 가기</button>
                    </div>
                </body>
                </html>
                `;
                
                res.send(html);
                
                // 임시 파일 삭제
                setTimeout(() => {
                    try {
                        fs.unlinkSync(filePath);
                        console.log('임시 파일 삭제됨:', filePath);
                    } catch (err) {
                        console.error('임시 파일 삭제 실패:', err);
                    }
                }, 60000); // 1분 후 삭제
            } catch (downloadError) {
                console.error('프로젝트 파일 다운로드 오류:', downloadError);
                
                // 다운로드 실패 시 직접 Entry Studio로 리다이렉트
                const entryUrl = 'https://playentry.org/ws';
                const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Entry Studio 리다이렉트</title>
                    <script>
                        window.onload = function() {
                            window.open('${entryUrl}', '_blank');
                            window.history.back();
                        };
                    </script>
                </head>
                <body>
                    <p>Entry Studio로 이동 중...</p>
                </body>
                </html>
                `;
                
                res.send(html);
            }
        } else {
            // 프로젝트 파일이 없으면 바로 Entry Studio 열기
            const entryUrl = 'https://playentry.org/ws';
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Entry Studio 리다이렉트</title>
                <script>
                    window.onload = function() {
                        window.open('${entryUrl}', '_blank');
                        window.history.back();
                    };
                </script>
            </head>
            <body>
                <p>Entry Studio로 이동 중...</p>
            </body>
            </html>
            `;
            
            res.send(html);
        }
        
        // 로그 기록
        console.log(`사용자 ${req.session?.userID || '익명'} Entry 워크스페이스 접근, 프로젝트: ${projectFile}`);
    } catch (error) {
        console.error('Entry 워크스페이스 리다이렉트 오류:', error);
        res.status(500).send('Entry 워크스페이스로 리다이렉트하는 중 오류가 발생했습니다.');
    }
});

module.exports = router;