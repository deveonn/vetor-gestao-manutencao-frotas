import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/fleet.store';
import { ModalService } from '../../core/modal.service';

/** "1.180,50" / "1180.5" / "420" -> número; null se não for um valor válido. */
function lerReais(txt: string): number | null {
  const limpo = txt.trim().replace(/^R\$\s*/i, '');
  if (!limpo) return null;
  // com vírgula: ponto é separador de milhar ("1.180,50"); sem vírgula, ponto é decimal ("1180.5")
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Number(normal);
}

/** Concluir manutenção (context = id): custo vai pro dashboard e relatórios; oficina pro histórico. */
@Component({
  selector: 'vetor-maintenance-done-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:440px">
        <h2 style="font-family:'Saira',sans-serif;font-weight:600;font-size:18px;margin:0">Concluir manutenção</h2>
        <p style="margin:0;color:var(--mut);font-size:13px;line-height:1.55">
          <span class="mono">{{ manutencao()?.v }}</span> · {{ manutencao()?.item }}
        </p>
        @if (erro()) {
          <div role="alert" class="form-error">
            <span class="material-symbols-outlined" style="color:var(--crit);font-size:18px;flex-shrink:0">error</span>
            <span>{{ erro() }}</span>
          </div>
        }
        <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:14px">
          <label class="field">Custo (R$) *
            <input [(ngModel)]="custo" inputmode="decimal" placeholder="ex.: 420,00">
          </label>
          <label class="field">Oficina
            <input [(ngModel)]="oficina" list="oficinas-usadas" placeholder="onde foi feita">
            <datalist id="oficinas-usadas">
              @for (o of oficinas(); track o) { <option [value]="o"></option> }
            </datalist>
          </label>
          <p style="grid-column:1/-1;margin:-4px 0 0;color:var(--dim);font-size:12px">Serviço em garantia: informe 0.</p>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-ghost" (click)="modal.close()">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Concluir manutenção' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class MaintenanceDoneModalComponent {
  modal = inject(ModalService);
  private store = inject(FleetStore);

  manutencao = computed(() => this.store.maintenanceItems().find((m) => m.id === this.modal.context()) ?? null);
  /** oficinas já usadas no histórico, pra não redigitar */
  oficinas = computed(() => [...new Set(this.store.maintenanceHistory().map((h) => h.ofi).filter((o): o is string => !!o))]);
  custo = '';
  oficina = '';
  private erroSig = signal('');
  erro = this.erroSig.asReadonly();
  salvando = signal(false);

  async salvar(): Promise<void> {
    const id = this.modal.context();
    const custo = lerReais(this.custo);
    if (!id) return;
    if (custo == null) {
      this.erroSig.set('Informe o custo em reais (ex.: 420,00). Serviço em garantia: 0.');
      return;
    }
    this.salvando.set(true);
    const erro = await this.store.completeMaintenance(id, { custo, oficina: this.oficina });
    this.salvando.set(false);
    if (erro) {
      this.erroSig.set(erro);
      return;
    }
    this.modal.close();
  }
}
