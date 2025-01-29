// public/js/learning-tracker.js

class LearningTracker {
    constructor(contentType, contentName) {
        this.contentType = contentType;
        this.contentName = contentName;
        this.isTracking = false;
        this.startTime = null;
    }

    async startTracking() {
        try {
            console.log('학습 추적 시작 시도:', {
                contentType: this.contentType,
                contentName: this.contentName
            });
    
            const response = await fetch('/api/learning/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content_type: this.contentType,
                    content_name: this.contentName
                })
            });
    
            // 응답 상태 로깅
            console.log('API 응답 상태:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API 오류 응답:', errorText);
                return;
            }
    
            const data = await response.json();
            if (data.success) {
                this.isTracking = true;
                this.startTime = new Date();
                console.log('학습 추적 시작 성공:', this.contentType, this.contentName);
            } else {
                console.error('학습 추적 시작 실패:', data.error);
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
                credentials: 'include',  // 세션 쿠키 포함을 위해 필요
                body: JSON.stringify({
                    content_type: this.contentType,
                    content_name: this.contentName,
                    progress: progress
                })
            });

            const data = await response.json();
            if (data.success) {
                this.isTracking = false;
                console.log('학습 추적 종료:', this.contentType, this.contentName);
            } else {
                console.error('학습 추적 종료 실패:', data.error);
            }
        } catch (error) {
            console.error('학습 추적 종료 오류:', error);
        }
    }
}

// 전역 변수로 tracker 인스턴스 저장
window.learningTracker = null;

// 페이지 언로드 시 학습 종료 처리
window.addEventListener('beforeunload', async () => {
    if (window.learningTracker && window.learningTracker.isTracking) {
        await window.learningTracker.endTracking();
    }
});