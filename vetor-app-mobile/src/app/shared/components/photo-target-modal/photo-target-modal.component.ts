import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-photo-target-modal',
  templateUrl: './photo-target-modal.component.html',
  styleUrl: './photo-target-modal.component.scss',
})
export class PhotoTargetModalComponent {
  /** Setados via componentProps do ModalController.create() — precisam ser propriedades simples, não signal inputs. */
  targetLabel = '';
  icon = 'photo_camera';
  /** diagrama do veículo destacando a posição (ex.: qual pneu) — quando presente, some o ícone */
  image = '';

  constructor(private modalCtrl: ModalController) {}

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm(): void {
    this.modalCtrl.dismiss(null, 'confirm');
  }
}
