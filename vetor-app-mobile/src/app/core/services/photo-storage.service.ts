import { Injectable } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const PASTA = 'fotos';

function mimeDoCaminho(path: string): string {
  return path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Fotos da vistoria como arquivos no armazenamento do app (Filesystem, Directory.Data) — o rascunho e a fila guardam
 * só o caminho. Antes elas iam em base64 dentro do Preferences (SharedPreferences no Android), que não foi feito pra
 * guardar MBs e é lido/regravado inteiro a cada mudança na fila.
 */
@Injectable({ providedIn: 'root' })
export class PhotoStorageService {
  /** dataUrl já lido de cada caminho — as telas mostram a mesma foto várias vezes */
  private cache = new Map<string, Promise<string>>();

  /** Grava a foto (dataUrl da câmera) e devolve o caminho relativo a Directory.Data. */
  async salvar(dataUrl: string): Promise<string> {
    const [cabecalho, base64] = dataUrl.split(',');
    const ext = cabecalho.includes('image/png') ? 'png' : cabecalho.includes('image/webp') ? 'webp' : 'jpg';
    const path = `${PASTA}/${crypto.randomUUID()}.${ext}`;
    await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true });
    this.cache.set(path, Promise.resolve(dataUrl));
    return path;
  }

  /** Lê a foto como dataUrl (pra mostrar na tela ou subir pra API). Rejeita se o arquivo não existe mais. */
  lerDataUrl(path: string): Promise<string> {
    let lida = this.cache.get(path);
    if (!lida) {
      lida = Filesystem.readFile({ path, directory: Directory.Data }).then(async ({ data }) => {
        const base64 = typeof data === 'string' ? data : await blobParaBase64(data);
        return `data:${mimeDoCaminho(path)};base64,${base64}`;
      });
      // falhou: não guarda, pra uma próxima leitura tentar de novo
      lida.catch(() => this.cache.delete(path));
      this.cache.set(path, lida);
    }
    return lida;
  }

  /** Apaga a foto; arquivo que já não existe não é erro. */
  async apagar(path: string | null | undefined): Promise<void> {
    if (!path) return;
    this.cache.delete(path);
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch {
      // já não existia
    }
  }
}
