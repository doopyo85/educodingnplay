const CACHE_NAME = 'coding2-v1';
const urlsToCache = [
  '/',
  '/auth/login',
  '/css/styles.css',
  '/css/header.css',
  '/js/pwa-install.js',
  '/resource/icons/icon-192x192.png',
  '/resource/icons/icon-512x512.png'
];

// 서비스 워커 설치 및 리소스 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 네트워크 리퀘스트 중간에서 캐시된 리소스 전달
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에서 찾았으면 캐시된 응답 반환
        if (response) {
          return response;
        }
        // 캐시에 없으면 네트워크 요청
        return fetch(event.request).then(
          response => {
            // 유효한 응답이 아니면 그냥 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답 복제 (스트림은 한 번만 사용 가능)
            const responseToCache = response.clone();

            // 새 응답 캐싱
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// 서비스 워커 활성화 시 이전 캐시 정리
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});