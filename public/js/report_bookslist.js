document.addEventListener('DOMContentLoaded', function() {
  // 메인 컨테이너 요소 확인
  const categoryContainer = document.getElementById('categoryContainer');
  if (!categoryContainer) {
    console.error('categoryContainer 요소를 찾을 수 없습니다.');
    return; // 컨테이너가 없으면 실행 중단
  }
  
  // 카테고리 그룹화 설정
  const categoryGroups = {
    'preschool': {
      title: '프리스쿨',
      categories: ['프리스쿨 LV1', '프리스쿨 LV2', '프리스쿨 LV3']
    },
    'junior': {
      title: '주니어',
      categories: ['주니어 LV1', '주니어 LV2']
    },
    'epl': {
      title: 'EPL 프로젝트',
      categories: ['CPS', 'CPA']
    },
    'advanced': {
      title: '텍스트프로그래밍',
      categories: ['앱인벤터', '파이썬']
    }
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
      
      // 테이블 생성
      const table = document.createElement('table');
      table.className = 'table table-hover table-bordered';
      
      // 테이블 헤더
      const thead = document.createElement('thead');
      thead.className = 'bg-light';
      thead.innerHTML = `
        <tr>
          <th width="10%">대구분</th>
          <th width="20%">중구분</th>
          <th width="70%">소구분 (호수)</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // 테이블 본문
      const tbody = document.createElement('tbody');
      
      // 각 그룹 및 카테고리별 행 추가
      Object.keys(categoryGroups).forEach(groupKey => {
        const group = categoryGroups[groupKey];
        let isFirstCategoryInGroup = true;
        
        group.categories.forEach(category => {
          if (data[category] && data[category].length > 0) {
            // 정렬된 교재 목록 (볼륨 숫자 기준)
            const sortedVolumes = [...data[category]].sort((a, b) => {
              return parseInt(a.volume) - parseInt(b.volume);
            });
            
            // 행 생성
            const row = document.createElement('tr');
            
            // 대구분 (첫 번째 카테고리만 표시)
            const groupCell = document.createElement('td');
            if (isFirstCategoryInGroup) {
              groupCell.textContent = group.title;
              groupCell.rowSpan = group.categories.filter(c => data[c] && data[c].length > 0).length;
            } else {
              groupCell.style.display = 'none'; // 두 번째 이후 카테고리는 표시하지 않음
            }
            
            // 중구분 (카테고리 이름)
            const categoryCell = document.createElement('td');
            categoryCell.textContent = category;
            
            // 소구분 (호수 버튼들)
            const volumesCell = document.createElement('td');
            const volumesContainer = document.createElement('div');
            volumesContainer.className = 'd-flex flex-wrap gap-2';
            
            // 각 호수 버튼 생성
            sortedVolumes.forEach(book => {
              if (!book.volume) return; // 볼륨 정보가 없는 경우 스킵
              
              const volumeBtn = document.createElement('a');
              volumeBtn.href = `/report/generate/${encodeURIComponent(category)}/${encodeURIComponent(book.volume)}`;
              volumeBtn.className = 'btn btn-sm btn-outline-primary';
              volumeBtn.textContent = `${book.volume}호`;
              volumeBtn.style.minWidth = '50px';
              
              volumesContainer.appendChild(volumeBtn);
            });
            
            volumesCell.appendChild(volumesContainer);
            
            // 셀을 행에 추가
            if (isFirstCategoryInGroup) {
              row.appendChild(groupCell);
            }
            row.appendChild(categoryCell);
            row.appendChild(volumesCell);
            
            // 행을 테이블에 추가
            tbody.appendChild(row);
            
            isFirstCategoryInGroup = false;
          }
        });
      });
      
      table.appendChild(tbody);
      categoryContainer.appendChild(table);
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