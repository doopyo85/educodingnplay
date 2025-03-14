// books.js - 칸아카데미 스타일 교재 선택 구현
document.addEventListener('DOMContentLoaded', function() {
    // 메인 컨테이너 요소 확인
    const categoryContainer = document.getElementById('categoryContainer');
    if (!categoryContainer) {
      console.error('categoryContainer 요소를 찾을 수 없습니다.');
      return; // 컨테이너가 없으면 실행 중단
    }
    
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
        console.log('받아온 교재 데이터:', data);
        
        // 컨테이너 초기화
        categoryContainer.innerHTML = '';
        
        // 데이터가 없는 경우
        if (!data || Object.keys(data).length === 0) {
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
          let hasContent = false;
          
          // 해당 그룹에 속한 카테고리가 데이터에 있는지 확인
          group.categories.forEach(category => {
            if (data[category] && data[category].length > 0) {
              hasContent = true;
            }
          });
          
          // 콘텐츠가 없으면 이 그룹은 표시하지 않음
          if (!hasContent) return;
          
          // 그룹 섹션 컨테이너 생성
          const groupSection = document.createElement('div');
          groupSection.className = 'khan-category';
          
          // 그룹 헤더 생성
          const groupHeader = document.createElement('div');
          groupHeader.className = 'khan-category-header';
          groupHeader.innerHTML = `
            <div class="khan-icon">
              <i class="bi bi-${group.icon}"></i>
            </div>
            <h2 class="khan-category-title">${group.title}</h2>
          `;
          
          // 교재 그리드 컨테이너 생성
          const booksContainer = document.createElement('div');
          booksContainer.className = 'khan-category-container';
          
          const booksGrid = document.createElement('div');
          booksGrid.className = 'khan-book-grid';
          
          // 그룹 내 카테고리별 교재 추가
          group.categories.forEach(category => {
            if (data[category] && data[category].length > 0) {
              // 정렬된 교재 목록 (볼륨 숫자 기준)
              const sortedVolumes = [...data[category]].sort((a, b) => {
                return parseInt(a.volume) - parseInt(b.volume);
              });
              
              // 교재 카드 생성
              const bookCard = document.createElement('div');
              bookCard.className = 'khan-book-card';
              
              // 교재 헤더
              const bookHeader = document.createElement('div');
              bookHeader.className = 'khan-book-header';
              bookHeader.innerHTML = `
                <h3 class="khan-book-title">${categoryMapping[category] || category}</h3>
              `;
              
              // 교재 콘텐츠
              const bookContent = document.createElement('div');
              bookContent.className = 'khan-book-content';
              
              // 교재 설명
              const bookDescription = document.createElement('p');
              bookDescription.className = 'khan-book-description';
              bookDescription.textContent = bookDescriptions[category] || '교재 설명';
              
              // 볼륨 선택 섹션
              const volumesSection = document.createElement('div');
              volumesSection.className = 'khan-volumes-section';
              
              const volumesHeading = document.createElement('div');
              volumesHeading.className = 'small-heading';
              volumesHeading.textContent = '호수 선택';
              
              const volumesContainer = document.createElement('div');
              volumesContainer.className = 'khan-volumes-container';
              
              // 각 호수 버튼 생성
              sortedVolumes.forEach(book => {
                if (!book.volume) return; // 볼륨 정보가 없는 경우 스킵
                
                const volumeBtn = document.createElement('a');
                volumeBtn.href = `/report/generate/${encodeURIComponent(category)}/${encodeURIComponent(book.volume)}`;
                volumeBtn.className = 'khan-volume-btn';
                volumeBtn.textContent = `${book.volume}호`;
                
                volumesContainer.appendChild(volumeBtn);
              });
              
              // 교재 푸터
              const bookFooter = document.createElement('div');
              bookFooter.className = 'khan-book-footer';
              bookFooter.innerHTML = `
                <span class="khan-volume-tag">${sortedVolumes.length} 호수</span>
                <span class="khan-badge">교재 학습</span>
              `;
              
              // 요소 결합
              volumesSection.appendChild(volumesHeading);
              volumesSection.appendChild(volumesContainer);
              
              bookContent.appendChild(bookDescription);
              bookContent.appendChild(volumesSection);
              
              bookCard.appendChild(bookHeader);
              bookCard.appendChild(bookContent);
              bookCard.appendChild(bookFooter);
              
              booksGrid.appendChild(bookCard);
            }
          });
          
          // 그룹 섹션에 헤더와 콘텐츠 추가
          booksContainer.appendChild(booksGrid);
          groupSection.appendChild(groupHeader);
          groupSection.appendChild(booksContainer);
          
          // 메인 컨테이너에 그룹 섹션 추가
          categoryContainer.appendChild(groupSection);
        });
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
  });