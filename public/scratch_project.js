let config;
let RANGE;  // 계정 유형에 따라 동적으로 변경될 변수

document.addEventListener("DOMContentLoaded", async function() {
    await loadConfig();  // config 로드
    console.log('Config:', config);  // config가 제대로 로드되었는지 확인
    loadSB2Data();  // SB2 데이터를 바로 로드
});

// 서버의 API에서 SB2 데이터를 가져오는 함수
async function loadSB2Data() {
    try {
      const data = await fetch('/api/get-sb2-data').then(res => res.json());
      console.log('SB2 data loaded:', data);  // 데이터가 제대로 로드되었는지 확인
      if (data && data.length > 0) {
        const projects = groupByProject(data);
        displayProjects(projects);  // 프로젝트를 화면에 출력
      } else {
        displayErrorMessage("스프레드시트에서 데이터를 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error('Error loading SB2 data', error);
      displayErrorMessage("SB2 데이터를 불러오는 중 오류가 발생했습니다.");
    }
  }

// 서버에서 config 및 사용자 정보를 가져오는 함수
async function loadConfig() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        config = await response.json();

        // 계정 유형에 따라 RANGE 값을 설정
        if (config.userType === 'student') {
            RANGE = 'sb3!A2:C';  // 학생용 범위
        } else if (config.userType === 'teacher' || config.userType === 'director') {
            RANGE = 'sb2!A2:C';  // 강사/원장용 범위
        }

        console.log('Config loaded:', config);
        console.log('RANGE set to:', RANGE);  // 설정된 RANGE 확인
    } catch (error) {
        console.error('Error loading config:', error);
        displayErrorMessage("설정을 불러오는 중 오류가 발생했습니다.");
    }
}

// 프로젝트 데이터를 그룹화하는 함수
function groupByProject(data) {
    const projects = {};
    data.forEach(row => {
        console.log(row);  // 각 row가 어떻게 생겼는지 확인
        const [name, url, ctElement] = row;
        const baseName = name.replace(/(\(기본\)|\(확장1\)|\(확장2\))/, '').trim();
        if (!projects[baseName]) {
            projects[baseName] = { ctElement: ctElement, basic: '', ext1: '', ext2: '' };
        }
        if (name.includes('(기본)')) {
            projects[baseName].basic = url;
        } else if (name.includes('(확장1)')) {
            projects[baseName].ext1 = url;
        } else if (name.includes('(확장2)')) {
            projects[baseName].ext2 = url;
        }
    });
    console.log('Grouped Projects:', projects);  // 그룹화된 결과 확인
    return projects;
}

// 프로젝트를 화면에 출력한 후 버튼 클릭 이벤트 리스너 추가
function displayProjects(projects) {
    const container = document.getElementById('content-container');
    container.innerHTML = ''; // 기존 내용을 초기화
    console.log('Displaying projects:', projects);  // 출력할 프로젝트 확인

    Object.keys(projects).forEach(projectName => {
        if (projectName === '새로 시작하기') return;

        const project = projects[projectName];
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6 mb-4';

        const cardContent = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${projectName}</h5>
                    <p class="card-text"><i class="bi bi-cpu"></i> C.T 학습 요소: ${project.ctElement || '정보 없음'}</p>
                    <p class="card-text">이 콘텐츠를 통해 재미있는 프로젝트를 경험해보세요.</p>
                    <div class="btn-group">
                        ${project.basic ? `<button class="btn btn-primary load-sb2" data-url="${project.basic}">기본</button>` : ''}
                        ${project.ext1 ? `<button class="btn btn-secondary load-sb2" data-url="${project.ext1}">확장1</button>` : ''}
                        ${project.ext2 ? `<button class="btn btn-secondary load-sb2" data-url="${project.ext2}">확장2</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        card.innerHTML = cardContent;
        container.appendChild(card);
    });

    // "load-sb2" 클래스를 가진 모든 버튼에 클릭 이벤트 리스너 추가
    document.querySelectorAll('.load-sb2').forEach(button => {
        button.addEventListener('click', function() {
            const sb2Url = this.getAttribute('data-url');
            console.log('Loading SB2 project from URL:', sb2Url);
            // Scratch-GUI에 sb2 파일을 로드하는 코드 추가
            loadSB2InScratchGUI(sb2Url);
        });
    });
}

// Scratch-GUI에서 sb2 파일 로드하는 함수
function loadSB2InScratchGUI(sb2Url) {
    // URL을 인코딩하여 Scratch-GUI로 전달
    const scratchEditorUrl = `https://codingnplay.site/scratch/?project_file=${encodeURIComponent(sb2Url)}`;
    console.log(`Opening Scratch GUI with SB2 URL: ${scratchEditorUrl}`);
    
    // 새로운 창으로 Scratch-GUI 열기
    window.open(scratchEditorUrl, '_blank');
}


// 오류 메시지를 화면에 출력하는 함수
function displayErrorMessage(message) {
    const container = document.getElementById('content-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
