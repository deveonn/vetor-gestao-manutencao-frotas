import { Pipe, PipeTransform, inject } from '@angular/core';
import { PhotoStorageService } from '../../core/services/photo-storage.service';

/** Caminho de foto salva (PhotoStorageService) -> src de <img>. Uso: `[src]="path | fotoSrc | async"`. */
@Pipe({ name: 'fotoSrc' })
export class FotoSrcPipe implements PipeTransform {
  private fotos = inject(PhotoStorageService);

  transform(path: string | null | undefined): Promise<string | null> {
    return path ? this.fotos.lerDataUrl(path).catch(() => null) : Promise.resolve(null);
  }
}
