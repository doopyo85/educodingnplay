//authCheck.js
module.exports = {
    isOwner: function (request) {
        if (request.session && request.session.is_logined) {
            return true;
        } else {
            return false;
        }
    },
    statusUI: function (request) {
        let authStatusUI = '로그인후 사용 가능합니다';
        if (this.isOwner(request)) {
            authStatusUI = `${request.session.nickname}님 환영합니다 | <a href="/auth/logout">로그아웃</a>`;
        }
        return authStatusUI;
    }
};
