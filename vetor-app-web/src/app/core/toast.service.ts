import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'ok' | 'info';

export interface Toast {
  id: number;
  msg: string;
  nv: ToastLevel;
  cor: string;
  glifo: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(msg: string, nv: ToastLevel = 'ok'): void {
    const id = Date.now() + Math.random();
    const toast: Toast = {
      id,
      msg,
      nv,
      cor: nv === 'info' ? 'var(--brand)' : 'var(--ok)',
      glifo: nv === 'info' ? 'info' : 'check_circle',
    };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(id), 4200);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
