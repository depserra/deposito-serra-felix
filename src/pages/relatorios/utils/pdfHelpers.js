// Função para carregar imagem como base64
export const getImageBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

// Gera um código único de 5 dígitos
export const gerarCodigoRelatorio = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Formata data no padrão brasileiro
export const formatarData = (data) => {
  return data.toLocaleDateString('pt-BR');
};

// Formata valor monetário
export const formatarMoeda = (valor) => {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
