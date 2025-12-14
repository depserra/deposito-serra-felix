// Service Worker para cache offline e melhor performance
const CACHE_VERSION = Date.now();
const CACHE_NAME = `serra-felix-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `serra-felix-runtime-v${CACHE_VERSION}`;

// Arquivos essenciais para cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-serra-felix.png'
];

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        console.log('🗑️ Limpando cache antigo:', cacheToDelete);
        return caches.delete(cacheToDelete);
      }));
    }).then(() => {
      console.log('✅ Service Worker ativado e caches limpos');
      return self.clients.claim();
    }).then(() => {
      // Notifica todos os clientes sobre a atualização
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora requisições de extensões do navegador e esquemas não suportados
  const url = event.request.url;
  if (url.startsWith('chrome-extension://') || 
      url.startsWith('moz-extension://') ||
      url.startsWith('safari-extension://')) {
    return;
  }

  // Ignora requisições do Firebase (sempre busca da rede)
  if (url.includes('firebaseio.com') || 
      url.includes('googleapis.com') ||
      url.includes('googlesyndication.com')) {
    return;
  }

  // Nunca faz cache de HTML - sempre busca versão mais recente
  if (event.request.url.endsWith('.html') || event.request.url === self.location.origin + '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          // Armazena a resposta em cache para uso futuro
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tenta buscar do cache
          return cache.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se não houver cache, retorna do cache principal
            return caches.match(event.request);
          });
        });
    })
  );
});

// Mensagens do cliente para controle do SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
