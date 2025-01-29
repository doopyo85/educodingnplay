// public/js/learning-tracker.js

class LearningTracker {
    constructor(contentType, contentName) {
        this.contentType = contentType;
        this.contentName = contentName;
        this.isTracking = false;
    }

    async startTracking() {
        if (this.isTracking) return;

        try {
            const response = await fetch('/api/learning/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content_type: this.contentType,
                    content_name: this.contentName
                })
            });

            const result = await response.json();
            if (result.success) {
                this.isTracking = true;
                console.log('학습 추적 시작됨:', this.contentName);
            } else {
                console.error('학습 추적 시작 실패:', result.error);
            }
        } catch (error) {
            console.error('학습 추적 시작 중 오류 발생:', error);
        }
    }

    async endTracking(progress = 0) {
        if (!this.isTracking) return;

        try {
            const response = await fetch('/api/learning/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content_type: this.contentType,
                    content_name: this.contentName,
                    progress: progress
                })
            });

            const result = await response.json();
            if (result.success) {
                this.isTracking = false;
                console.log('학습 추적 종료됨:', this.contentName);
            } else {
                console.error('학습 추적 종료 실패:', result.error);
            }
        } catch (error) {
            console.error('학습 추적 종료 중 오류 발생:', error);
        }
    }
}

// 전역 인스턴스 저장
window.learningTracker = null;

// 페이지 이탈 시 자동 종료
window.addEventListener('beforeunload', async () => {
    if (window.learningTracker) {
        await window.learningTracker.endTracking();
    }
});