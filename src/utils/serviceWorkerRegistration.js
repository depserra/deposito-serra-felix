// Registra o Service Worker para funcionalidade offline
export function registerServiceWorker() {
  // Desativa o Service Worker em ambiente de desenvolvimento local para evitar cache indesejado
  if (import.meta.env.DEV) {
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado com sucesso:', registration.scope);
          
          // Verifica por atualizações a cada 5 minutos
          setInterval(() => {
            registration.update();
            console.log('🔄 Verificando atualizações...');
          }, 5 * 60 * 1000);

          // Verifica imediatamente se há atualização pendente
          registration.update();

          // Notifica quando houver uma nova versão
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🆕 Nova versão encontrada!');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Nova versão disponível - atualiza automaticamente após 3 segundos
                  console.log('📦 Nova versão instalada, atualizando...');
                  showUpdateNotification();
                  
                  setTimeout(() => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }, 3000);
                } else {
                  // Primeira instalação
                  console.log('✅ Conteúdo em cache para uso offline');
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Erro ao registrar Service Worker:', error);
        });

      // Recarrega a página quando um novo SW assume o controle
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('♻️ Aplicando nova versão...');
          window.location.reload();
        }
      });

      // Recebe mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('✨ Aplicação atualizada!');
        }
      });
    });
  }
}

// Mostra notificação de atualização
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.innerHTML = '🎉 Nova versão disponível! Atualizando em 3s...';
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Remove o Service Worker (útil para desenvolvimento)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Erro ao remover Service Worker:', error);
      });
  }
}

// Limpa todo o cache
export function clearCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    });
  }
}
