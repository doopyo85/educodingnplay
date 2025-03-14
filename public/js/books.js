// books.js - 교재 선택 화면 구현
document.addEventListener('DOMContentLoaded', function() {
    const categoryContainer = document.getElementById('categoryContainer');
    
    // 카테고리 이름 매핑 (영문 -> 한글)
    const categoryMapping = {
      'preschool_lv1': '프리스쿨 LV1',
      'preschool_lv2': '프리스쿨 LV2',
      'preschool_lv3': '프리스쿨 LV3',
      'junior_lv1': '주니어 LV1',
      'junior_lv2': '주니어 LV2',
      'cps': 'CPS',
      'cpa': 'CPA',
      'appinventor': '앱인벤터',
      'python': '파이썬'
    };
    
    // 카테고리 그룹화 설정
    const categoryGroups = {
      'preschool': {
        title: '프리스쿨',
        description: '유아 코딩 교육 (5-7세)',
        icon: 'book',
        iconColor: '#3b82f6',
        categories: ['preschool_lv1', 'preschool_lv2', 'preschool_lv3']
      },
      'junior': {
        title: '주니어',
        description: '초등학생 코딩 교육 (8-12세)',
        icon: 'journal-code',
        iconColor: '#8b5cf6',
        categories: ['junior_lv1', 'junior_lv2']
      },
      'epl': {
        title: 'EPL 프로젝트',
        description: '교육용 프로그래밍 언어',
        icon: 'code-square',
        iconColor: '#ec4899',
        categories: ['cps', 'cpa']
      },
      'advanced': {
        title: '고급 프로그래밍',
        description: '실전 프로그래밍 언어',
        icon: 'laptop-code',
        iconColor: '#10b981',
        categories: ['appinventor', 'python']
      }
    };
    
    // 교재별 설명 추가
    const bookDescriptions = {
      'preschool_lv1': '기초 코딩 개념 이해하기',
      'preschool_lv2': '논리적 사고력 발달',
      'preschool_lv3': '창의적 문제 해결력',
      'junior_lv1': '기본 알고리즘 이해하기',
      'junior_lv2': '프로그래밍 심화',
      'cps': '스크래치 프로그래밍',
      'cpa': '앱 인벤터 기초',
      'appinventor': '모바일 앱 개발',
      'python': '텍스트 기반 프로그래밍'
    };
    
    // 교재 목록 가져오기
    fetch('/report/books')
      .then(response => {
        if (!response.ok) {
          throw new Error('교재 목록을 불러오는데 실패했습니다.');
        }
        return response.json();
      })
      .then(data => {
        // 컨테이너 초기화
        categoryContainer.innerHTML = '';
        
        // 데이터가 없는 경우
        if (Object.keys(data).length === 0) {
          categoryContainer.innerHTML = `
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              사용 가능한 교재 정보가 없습니다.
            </div>
          `;
          return;
        }
        
        // 그룹별로 카테고리 렌더링
        Object.keys(categoryGroups).forEach(groupKey => {
          const group = categoryGroups[groupKey];
          
          // 그룹 섹션 컨테이너 생성
          const groupSection = document.createElement('div');
          groupSection.className = 'course-category mb-4';
          
          // 그룹 헤더 생성
          const groupHeader = document.createElement('div');
          groupHeader.className = 'category-header';
          groupHeader.innerHTML = `
            <div class="category-icon" style="background-color: ${group.iconColor}">
              <i class="bi bi-${group.icon}"></i>
            </div>
            <h2 class="category-title">${group.title}</h2>
            <span class="category-description">${group.description}</span>
          `;
          
          // 교재 컨테이너 생성
          const booksContainer = document.createElement('div');
          booksContainer.className = 'books-container';
          
          // 그룹 내 카테고리별 교재 추가
          group.categories.forEach(category => {
            if (data[category]) {
              // 교재 아이템 생성
              const bookItem = document.createElement('div');
              bookItem.className = 'book-item';
              
              // 교재 볼륨 수 계산
              const volumeCount = data[category].length;
              
              // 교재 아이콘
              const bookIcon = document.createElement('div');
              bookIcon.className = 'book-icon';
              bookIcon.innerHTML = `<i class="bi bi-${group.icon}"></i>`;
              
              // 교재 내용
              const bookContent = document.createElement('div');
              bookContent.className = 'book-content';
              bookContent.innerHTML = `
                <h3 class="book-title">${categoryMapping[category] || category}</h3>
                <p class="book-description">${bookDescriptions[category] || '교재 설명'}</p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.random() * 50 + 50}%"></div>
                </div>
                <div class="book-info">
                  <span>${volumeCount}호 시리즈</span>
                  <span>학습자료</span>
                </div>
              `;
              
              // 액션 버튼
              const actionButton = document.createElement('a');
              actionButton.href = '#';
              actionButton.className = 'action-button';
              actionButton.textContent = '호수 선택';
              actionButton.setAttribute('data-bs-toggle', 'modal');
              actionButton.setAttribute('data-bs-target', '#volumeModal');
              actionButton.setAttribute('data-category', category);
              
              // 요소 결합
              bookItem.appendChild(bookIcon);
              bookItem.appendChild(bookContent);
              bookItem.appendChild(actionButton);
              booksContainer.appendChild(bookItem);
            }
          });
          
          // 그룹 섹션에 헤더와 콘텐츠 추가
          groupSection.appendChild(groupHeader);
          groupSection.appendChild(booksContainer);
          
          // 메인 컨테이너에 그룹 섹션 추가
          categoryContainer.appendChild(groupSection);
        });
        
        // 호수 선택 모달 생성
        createVolumeModal();
      })
      .catch(error => {
        console.error('Error:', error);
        categoryContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle me-2"></i>
            교재 정보를 불러오는 중 오류가 발생했습니다: ${error.message}
          </div>
        `;
      });
    
    // 호수 선택 모달 생성 함수
    function createVolumeModal() {
      // 모달이 없으면 생성
      if (!document.getElementById('volumeModal')) {
        const modalHTML = `
          <div class="modal fade" id="volumeModal" tabindex="-1" aria-labelledby="volumeModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="volumeModalLabel">호수 선택</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div class="volume-buttons d-flex flex-wrap gap-2">
                    <!-- 여기에 호수 버튼이 동적으로 생성됩니다 -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 모달 이벤트 리스너 추가
        const volumeModal = document.getElementById('volumeModal');
        volumeModal.addEventListener('show.bs.modal', function(event) {
          const button = event.relatedTarget;
          const category = button.getAttribute('data-category');
          const volumeButtonsContainer = volumeModal.querySelector('.volume-buttons');
          const modalTitle = volumeModal.querySelector('.modal-title');
          
          // 모달 제목 업데이트
          modalTitle.textContent = `${categoryMapping[category] || category} 호수 선택`;
          
          // 호수 버튼 컨테이너 초기화
          volumeButtonsContainer.innerHTML = '';
          
          // 해당 카테고리의 교재 데이터 가져오기
          fetch('/report/books')
            .then(response => response.json())
            .then(booksData => {
              if (booksData[category]) {
                // 정렬된 교재 목록 (볼륨 숫자 기준)
                const sortedVolumes = [...booksData[category]].sort((a, b) => {
                  return parseInt(a.volume) - parseInt(b.volume);
                });
                
                // 각 교재 버튼 생성
                sortedVolumes.forEach(book => {
                  if (!book.volume) return; // 볼륨 정보가 없는 경우 스킵
                  
                  const volumeBtn = document.createElement('a');
                  volumeBtn.href = `/report/generate/${encodeURIComponent(category)}/${encodeURIComponent(book.volume)}`;
                  volumeBtn.className = 'btn btn-outline-primary';
                  volumeBtn.textContent = `${book.volume}호`;
                  
                  volumeButtonsContainer.appendChild(volumeBtn);
                });
              }
            })
            .catch(error => {
              console.error('Error fetching volumes:', error);
              volumeButtonsContainer.innerHTML = `
                <div class="alert alert-danger">
                  교재 정보를 불러오는 중 오류가 발생했습니다.
                </div>
              `;
            });
        });
      }
    }
  });