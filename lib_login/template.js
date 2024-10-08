module.exports = {
    HTML: function (title, body, authStatusUI) {
        return `
    <!doctype html>
    <html>
    <head>
      <title>코딩앤플레이 - ${title}</title>
      <meta charset="utf-8">
      <style>
        @import url(https://fonts.googleapis.com/earlyaccess/notosanskr.css);

        body {
            font-family: 'Noto Sans KR', sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 360px;
        }

        .logo {
            width: 80px;
            margin-bottom: 15px;
        }

        h2 {
            color: #333;
            margin: 0 0 15px;
            font-size: 18px;
            text-align: center;
        }

        form {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .login, input[type="text"], input[type="password"], input[type="email"], input[type="tel"], input[type="date"], select {
            width: 100%;
            padding: 10px;
            margin-bottom: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f8f9fa;
            font-size: 14px;
            box-sizing: border-box;
        }

        .login-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
        }

        .checkbox-container label {
            margin-left: 5px;
            color: #666;
        }

        .forgot-password {
            color: #666;
            text-decoration: none;
        }

        .btn {            
            width: 100%;
            background-color: black;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 5px;
        }

        .register-link {
            margin-top: 15px;
            color: #666;
            font-size: 13px;
            text-align: center;
        }

        .register-link a {
            color: #333;
            text-decoration: none;
            font-weight: bold;
        }

        .error-message {
            color: red;
            margin-top: 10px;
            font-size: 13px;
            text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${title}</h2>
        ${authStatusUI}
        ${body}
        <div id="error-message" class="error-message"></div>
      </div>
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script>
        $(document).ready(function() {
            $('#loginForm').on('submit', function(e) {
                e.preventDefault();
                const userID = $('input[name="userID"]').val();
                const password = $('input[name="pwd"]').val();
                
                if (!userID || !password) {
                    $('#error-message').text('아이디와 비밀번호를 입력해주세요.');
                    return;
                }

                $.ajax({
                    url: '/auth/login_process',
                    method: 'POST',
                    data: JSON.stringify({ userID, password }),
                    contentType: 'application/json',
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function(response) {
                        if (response.success) {
                            window.location.href = response.redirect;
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('Login error:', xhr.responseJSON);
                        $('#error-message').text(xhr.responseJSON?.error || "로그인 중 오류가 발생했습니다.");
                    }
                });
            });
        });
      </script>
    </body>
    </html>
        `;
    }
}