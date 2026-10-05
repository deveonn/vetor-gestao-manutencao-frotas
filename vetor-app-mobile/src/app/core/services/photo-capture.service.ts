import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ToastController } from '@ionic/angular/standalone';

/** ~1600 px no lado maior deixa a foto em algumas centenas de KB (o sensor entrega 4000+ px, vários MB) */
const MAX_LADO_PX = 1600;

@Injectable({ providedIn: 'root' })
export class PhotoCaptureService {
  constructor(private toastCtrl: ToastController) {}

  /**
   * Abre a câmera nativa direto. Retorna a foto em base64 ou null se cancelou/falhou. A câmera já devolve a foto
   * reduzida (lado maior até MAX_LADO_PX): o gestor só precisa enxergar o pneu/avaria, e cada foto fica no celular
   * até a vistoria ser enviada.
   */
  async capture(source: CameraSource = CameraSource.Camera): Promise<string | null> {
    try {
      const photo = await Camera.getPhoto({
        source,
        resultType: CameraResultType.DataUrl,
        quality: 70,
        width: MAX_LADO_PX,
        height: MAX_LADO_PX,
        allowEditing: false,
      });
      return photo.dataUrl ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const cancelled = /cancel/i.test(message);
      if (!cancelled) {
        const toast = await this.toastCtrl.create({
          message: 'não foi possível tirar a foto — tente de novo.',
          duration: 2200,
          color: 'danger',
        });
        await toast.present();
      }
      return null;
    }
  }
}
