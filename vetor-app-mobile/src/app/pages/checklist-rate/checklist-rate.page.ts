import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import type { PluginListenerHandle } from '@capacitor/core';
import { ToastController } from '@ionic/angular/standalone';
import { InspectionService } from '../../core/services/inspection.service';
import { PhotoCaptureService } from '../../core/services/photo-capture.service';
import { PhotoStorageService } from '../../core/services/photo-storage.service';
import { FotoSrcPipe } from '../../shared/pipes/foto-src.pipe';
import { TargetAnnounceService } from '../../core/services/target-announce.service';
import { ChecklistStepState, Rating, SubItemState } from '../../core/models/inspection.model';
import { photoTargetLabel } from '../../core/utils/photo-target-label';

@Component({
  selector: 'app-checklist-rate',
  imports: [FormsModule, AsyncPipe, FotoSrcPipe],
  templateUrl: './checklist-rate.page.html',
  styleUrl: './checklist-rate.page.scss',
})
export class ChecklistRatePage implements OnInit, OnDestroy {
  stepId = '';
  subIndex = 0;
  step: ChecklistStepState | null = null;
  sub: SubItemState | null = null;
  readonly selected = signal<Rating | null>(null);
  readonly noteText = signal('');
  readonly capturing = signal(false);
  readonly busy = signal(false);
  private fotos = inject(PhotoStorageService);
  private keyboardShowListener?: PluginListenerHandle;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inspection: InspectionService,
    private photoCapture: PhotoCaptureService,
    private announce: TargetAnnounceService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    // /vistoria/avaliar/:stepId/:subIndex é a mesma rota entre um pneu e o próximo — o Angular reaproveita
    // esta instância do componente em vez de recriá-la, então precisamos reagir a mudanças de parâmetro
    // (paramMap$) em vez de ler o snapshot só uma vez, senão o estado fica travado no primeiro pneu.
    this.route.paramMap.subscribe((params) => {
      this.stepId = params.get('stepId')!;
      this.subIndex = Number(params.get('subIndex'));
      const step = this.inspection.getStep(this.stepId);
      if (!step) {
        this.router.navigateByUrl('/vistoria');
        return;
      }
      this.step = step;
      this.sub = step.subItems[this.subIndex];
      this.selected.set(this.sub.rating);
      this.noteText.set(this.sub.note ?? '');
    });

    // o resize nativo (windowSoftInputMode=adjustResize) encolhe a WebView, mas nem sempre o
    // campo focado rola pra dentro da área visível sozinho — força isso quando o teclado abre.
    Keyboard.addListener('keyboardDidShow', () => {
      (document.activeElement as HTMLElement | null)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }).then((handle) => {
      this.keyboardShowListener = handle;
    });
  }

  ngOnDestroy(): void {
    this.keyboardShowListener?.remove();
  }

  get targetLabel(): string {
    return photoTargetLabel(this.step!, this.subIndex);
  }

  get positionLabel(): string | null {
    if (!this.step || this.step.subItems.length <= 1) return null;
    return `${this.step.label} ${this.subIndex + 1} de ${this.step.subItems.length}`;
  }

  private get isBadRating(): boolean {
    const rating = this.selected();
    return rating === 'atencao' || rating === 'trocar';
  }

  /** card de foto só aparece depois de marcar atenção/trocar em passos com photoRequirement 'on-issue' (pneus, lataria) */
  get showOnIssuePhoto(): boolean {
    return this.step?.photoRequirement === 'on-issue' && this.isBadRating;
  }

  /** campo de descrição só aparece depois de marcar atenção/trocar em passos com noteOnIssue (pneus, óleo/água, lataria) */
  get showOnIssueNote(): boolean {
    return !!this.step?.noteOnIssue && this.isBadRating;
  }

  /** foto é obrigatória pra este item, mas ainda não foi tirada — trava o botão de confirmar */
  get photoMissing(): boolean {
    return this.showOnIssuePhoto && !this.sub?.photoPath;
  }

  /** descrição é obrigatória pra este item, mas ainda não foi escrita — trava o botão de confirmar */
  get noteMissing(): boolean {
    return this.showOnIssueNote && !this.noteText().trim();
  }

  get alertContextSuffix(): string {
    if (this.showOnIssuePhoto && this.showOnIssueNote) return ' junto com a foto e a descrição.';
    if (this.showOnIssuePhoto) return ' junto com a foto.';
    if (this.showOnIssueNote) return ' junto com a descrição.';
    return '.';
  }

  async choose(rating: Rating): Promise<void> {
    this.selected.set(rating);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // sem suporte a haptics (ex.: navegador) — segue sem vibração
    }
  }

  async capturePhoto(): Promise<void> {
    if (this.capturing()) return;
    this.capturing.set(true);
    const dataUrl = await this.photoCapture.capture();
    let path: string | null = null;
    if (dataUrl) {
      try {
        path = await this.fotos.salvar(dataUrl);
      } catch {
        const toast = await this.toastCtrl.create({
          message: 'não foi possível guardar a foto — o celular pode estar sem espaço.',
          duration: 2600,
          color: 'danger',
        });
        await toast.present();
      }
    }
    this.capturing.set(false);
    if (!path) return;

    this.inspection.setPhoto(this.stepId, this.subIndex, path);
    this.step = this.inspection.getStep(this.stepId) ?? null;
    this.sub = this.step?.subItems[this.subIndex] ?? null;
  }

  async confirm(): Promise<void> {
    const rating = this.selected();
    if (!rating || !this.step || this.photoMissing || this.noteMissing || this.busy()) return;

    this.inspection.setRating(this.stepId, this.subIndex, rating);
    if (this.showOnIssueNote) {
      this.inspection.setNote(this.stepId, this.subIndex, this.noteText());
    }

    if (rating === 'trocar') {
      const toast = await this.toastCtrl.create({
        message: 'alerta registrado para o gestor.',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
    }

    const nextSubIndex = this.subIndex + 1;
    if (nextSubIndex >= this.step.subItems.length) {
      this.router.navigateByUrl('/vistoria');
      return;
    }

    // passos com mais de uma posição (ex.: pneus) avisam qual a próxima antes de navegar pra lá
    if (this.step.subItems.length > 1) {
      this.busy.set(true);
      const confirmed = await this.announce.announce(
        photoTargetLabel(this.step, nextSubIndex),
        this.step.icon,
        this.step.subItems[nextSubIndex].image,
      );
      this.busy.set(false);
      if (!confirmed) {
        this.router.navigateByUrl('/vistoria');
        return;
      }
    }

    this.router.navigateByUrl(`/vistoria/avaliar/${this.stepId}/${nextSubIndex}`);
  }

  back(): void {
    this.router.navigateByUrl('/vistoria');
  }

  confirmLabel(): string {
    switch (this.selected()) {
      case 'trocar':
        return 'confirmar: precisa manutenção corretiva';
      case 'atencao':
        return 'confirmar: precisa de atenção';
      case 'ok':
        return 'confirmar: está bom';
      default:
        return 'confirmar';
    }
  }
}
