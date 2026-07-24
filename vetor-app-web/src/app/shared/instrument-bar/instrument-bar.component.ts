import { Component, input } from '@angular/core';

/**
 * Padrão de instrumento do Vetor: escala de ticks com preenchimento sobreposto
 * e "agulha" (borda direita de 2px). Usado em combustível, custo, km/L e prazos.
 */
@Component({
  selector: 'vetor-instrument-bar',
  template: `
    <div class="tick-track" [style.height.px]="height()">
      <div class="fill"
        [style.width.%]="pct()"
        [style.background]="'linear-gradient(90deg,transparent 20%,' + color() + ')'"
        [style.border-right]="'2px solid ' + color()"></div>
      @if (markerPct() != null) {
        <div class="marker" [style.left.%]="markerPct()"></div>
      }
    </div>
  `,
  styles: [`
    .tick-track { position: relative; border-radius: 2px; }
    .fill { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 2px; }
    .marker { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--dim); }
  `],
})
export class InstrumentBarComponent {
  readonly pct = input(0);
  readonly color = input('var(--ok)');
  readonly height = input(8);
  readonly markerPct = input<number | null>(null);
}
