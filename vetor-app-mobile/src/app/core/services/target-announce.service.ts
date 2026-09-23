import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { PhotoTargetModalComponent } from '../../shared/components/photo-target-modal/photo-target-modal.component';

@Injectable({ providedIn: 'root' })
export class TargetAnnounceService {
  constructor(private modalCtrl: ModalController) {}

  /**
   * Mostra qual posição o motorista está prestes a avaliar (ex.: qual pneu) antes de navegar pra lá.
   * Não abre câmera — é só orientação, a foto (se precisar) é decidida depois de avaliar.
   * Retorna false se o usuário cancelou.
   */
  async announce(targetLabel: string, icon: string, image?: string): Promise<boolean> {
    const modal = await this.modalCtrl.create({
      component: PhotoTargetModalComponent,
      cssClass: 'auto-height-modal',
      backdropDismiss: true,
      componentProps: { targetLabel, icon, image },
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    return role === 'confirm';
  }
}
