document.addEventListener('DOMContentLoaded', async function () {
    try {
        const userType = await getUserType();
        console.log("🟢 유저 역할 확인:", userType);

        await loadScratchData(userType);
    } catch (error) {
        console.error('❌ 사용자 유형을 가져오는 중 오류 발생:', error);
    }
});

// 사용자 계정 유형을 가져오는 함수
async function getUserType() {
    try {
        const response = await fetch('/api/get-user-type');
        if (!response.ok) {
            throw new Error('HTTP 오류 발생: ' + response.status);
        }
        const { userType } = await response.json();
        
        console.log("🟢 유저 역할 확인:", userType); // 디버깅 로그 추가
        return userType;
    } catch (error) {
        console.error('🔴 유저 타입 로드 실패:', error);
        return 'guest';  // 오류 발생 시 기본값으로 guest 할당
    }
}

// Scratch 데이터 로드 함수
async function loadScratchData(userType) {
    try {
        const scratchUrl = userType === 'student' || userType === 'guest' 
            ? '/api/get-sb3-data' 
            : '/api/get-sb2-data';

        console.log("🟢 최종 Scratch 데이터 요청:", scratchUrl);

        const data = await fetch(scratchUrl).then(res => res.json());

        if (data && data.length > 0) {
            const projects = groupByProject(data, userType);
            displayProjects(projects, userType);
        } else {
            displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error('❌ Scratch 데이터 로드 오류', error);
        displayErrorMessage("Scratch 데이터를 불러오는 중 오류가 발생했습니다.");
    }
}

// 프로젝트 목록을 화면에 출력하는 함수
function displayProjects(projects, userType) {
    const container = document.getElementById('content-container');
    container.innerHTML = '';

    Object.keys(projects).forEach(projectName => {
        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        // 학생 및 게스트는 PPT 버튼 비활성화
        const isRestricted = userType === 'student' || userType === 'guest';

        const cardContent = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text">
                        <i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}
                    </p>
                    <div class="btn-group">
                        ${project.basic ? `<button class="btn load-scratch" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn load-scratch" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn load-scratch" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                </div>
                ${project.ppt 
                    ? `<button class="btn btn-outline-secondary btn-sm open-ppt" data-url="${project.ppt}" 
                        ${isRestricted ? 'disabled' : ''}>📂 PPT</button>` 
                    : ''}
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // PPT 버튼 클릭 이벤트 리스너 추가
    document.querySelectorAll('.open-ppt').forEach(button => {
        button.addEventListener('click', function() {
            if (this.hasAttribute('disabled')) {
                alert("❌ PPT 자료는 강사 및 관리자만 접근할 수 있습니다.");
                return;
            }
            const pptUrl = this.getAttribute('data-url');
            window.open(pptUrl, '_blank');
        });
    });
}

// 프로젝트 데이터를 그룹화하는 함수
function groupByProject(data, userType) {
    const projects = {};
    
    data.forEach(item => {
        const projectName = item['프로젝트명'];
        if (!projects[projectName]) {
            projects[projectName] = { basic: null, ext1: null, ext2: null, ppt: null, ctElement: item['CT 요소'] };
        }

        switch (item['버전']) {
            case '기본':
                projects[projectName].basic = item['URL'];
                break;
            case '확장1':
                projects[projectName].ext1 = item['URL'];
                break;
            case '확장2':
                projects[projectName].ext2 = item['URL'];
                break;
            case 'PPT':
                projects[projectName].ppt = item['URL'];
                break;
        }
    });

    return projects;
}

// 오류 메시지 표시 함수
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger">${message}</div>`;
}
