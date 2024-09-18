module.exports = {
    HTML: function (title, body, authStatusUI) {
        return `
    <!doctype html>
    <html>
    <head>
      <title>Login TEST - ${title}</title>
      <meta charset="utf-8">
      <style>
        @import url(https://fonts.googleapis.com/earlyaccess/notosanskr.css);

        body {
            font-family: 'Noto Sans KR', sans-serif;
            background-color: #AAA2C2;
            margin: 50px;
        }

        .background {
            background-color: white;
            height: auto;
            width: 90%;
            max-width: 450px;
            padding: 10px;
            margin: 0 auto;
            border-radius: 5px;
            box-shadow: 0px 40px 30px -20px rgba(0, 0, 0, 0.3);
            text-align: center;
        }

        form {
            display: flex;
            padding: 30px;
            flex-direction: column;
        }

        .login {
            border: none;
            border-bottom: 2px solid #D1D1D4;
            background: none;
            padding: 10px;
            font-weight: 700;
            transition: .2s;
            width: 75%;
        }
        .login:active,
        .login:focus,
        .login:hover {
            outline: none;
            border-bottom-color: #6A679E;
        }

        .btn {            
            border: none;
            width: 75%;
            background-color: #6A679E;
            color: white;
            padding: 15px 0;
            font-weight: 600;
            border-radius: 5px;
            cursor: pointer;
            transition: .2s;
        }
        .btn:hover {
            background-color: #595787;
        }

        .error-message {
            color: red;
            margin-top: 10px;
        }
    </style>
    </head>
    <body>
      <div class="background">
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
                
                // Check if the input fields are not empty
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
                        withCredentials: true  // 쿠키 정보를 포함
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
