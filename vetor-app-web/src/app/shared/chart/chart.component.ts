import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, input } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ThemeService } from '../../core/theme.service';

Chart.register(...registerables);

export interface ThemeColors {
  txt: string; mut: string; dim: string; line: string;
  brand: string; ok: string; warn: string; crit: string; surf: string;
}

@Component({
  selector: 'vetor-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host { display: block; position: relative; width: 100%; height: 100%; }
    canvas { width: 100% !important; height: 100% !important; }
  `],
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly build = input.required<(colors: ThemeColors) => ChartConfiguration<any>>();

  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private theme = inject(ThemeService);
  private viewReady = false;

  constructor() {
    effect(() => {
      this.theme.theme();
      this.build();
      if (this.viewReady) this.draw();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.draw();
  }

  private draw(): void {
    const el = this.canvasRef.nativeElement;
    const colors = this.readColors(el);
    this.chart?.destroy();
    this.chart = new Chart(el, this.build()(colors));
  }

  private readColors(el: HTMLElement): ThemeColors {
    const cs = getComputedStyle(el);
    const g = (n: string) => cs.getPropertyValue(n).trim();
    return {
      txt: g('--txt'), mut: g('--mut'), dim: g('--dim'), line: g('--line'),
      brand: g('--brand'), ok: g('--ok'), warn: g('--warn'), crit: g('--crit'), surf: g('--surf'),
    };
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
