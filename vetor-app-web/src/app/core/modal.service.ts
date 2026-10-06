import { Injectable, signal } from '@angular/core';

export type ModalId = 'excluir' | 'abast' | 'mot' | 'acesso' | 'manut' | 'concluir' | 'veic' | 'buscaVeic' | 'fornecedor' | null;

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly active = signal<ModalId>(null);
  /** placa do veículo em foco (excluir veículo, agendar manutenção), id do motorista (acesso ao app) ou da manutenção (concluir) */
  readonly context = signal<string | null>(null);
  /** callback opcional para quando o modal de busca de veículo seleciona um item */
  onVeiculoEscolhido: ((placa: string) => void) | null = null;

  open(id: ModalId, context: string | null = null): void {
    this.context.set(context);
    this.active.set(id);
  }

  close(): void {
    this.active.set(null);
    this.context.set(null);
    this.onVeiculoEscolhido = null;
  }
}
