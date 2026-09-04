/**
 * Lê o arquivo da galeria e redimensiona para no máximo 1600px para edição e corte
 * fluidos sem travamentos ou estouro de memória, preservando alta qualidade visual.
 */
export async function lerArquivoParaEdicao(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } else {
          resolve(e.target?.result as string);
        }
      };

      img.onerror = () => {
        reject(new Error('Erro ao abrir a imagem. Tente outro arquivo.'));
      };

      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      } else {
        reject(new Error('Falha ao ler o arquivo selecionado.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo da galeria.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Processa e comprime uma foto para armazenamento no perfil do usuário
 * Redimensiona para no máximo 320x320 px mantendo a proporção e gerando JPEG leve.
 */
export async function processarFotoPerfil(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem para processamento.'));
      };

      if (typeof e.target?.result === 'string') {
        img.src = e.target.result;
      } else {
        reject(new Error('Falha ao ler arquivo.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro na leitura do arquivo.'));
    };

    reader.readAsDataURL(file);
  });
}
