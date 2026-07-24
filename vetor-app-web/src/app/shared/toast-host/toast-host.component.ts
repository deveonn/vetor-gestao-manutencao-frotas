import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'vetor-toast-host',
  template: `
    <div style="position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;gap:10px;z-index:90">
      @for (t of toasts.toasts(); track t.id) {
        <div role="status" style="display:flex;align-items:flex-start;gap:10px;background:var(--surf2);border:1px solid var(--line2);border-radius:10px;padding:12px 16px;box-shadow:var(--shadow);animation:slidein .25s ease;max-width:360px"
          [style.border-left]="'3px solid ' + t.cor">
          <span class="material-symbols-outlined" style="font-size:18px;margin-top:1px" [style.color]="t.cor">{{ t.glifo }}</span>
          <span style="font-size:13.5px;line-height:1.45">{{ t.msg }}</span>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  toasts = inject(ToastService);
}
