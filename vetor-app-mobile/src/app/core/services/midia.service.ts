import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** POST /midia — sobe uma foto (multipart, campo "arquivo") e devolve o id pra vistoria referenciar. */
@Injectable({ providedIn: 'root' })
export class MidiaService {
  private http = inject(HttpClient);

  async upload(dataUrl: string, nome: string): Promise<string> {
    const blob = await (await fetch(dataUrl)).blob();
    const extensao = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    const form = new FormData();
    form.append('arquivo', blob, `${nome}.${extensao}`);
    const midia = await firstValueFrom(this.http.post<{ id: string }>(`${environment.apiUrl}/midia`, form));
    return midia.id;
  }
}
