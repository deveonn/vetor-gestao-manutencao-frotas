import { ChartConfiguration } from 'chart.js';
import { ThemeColors } from './chart.component';

/** Barra (custo) + linha (km/L) combinadas, dois eixos Y — "Custo e eficiência por semana". */
export function buildTrendChart(labels: string[], custoSem: number[], kmlSem: number[]) {
  return (c: ThemeColors): ChartConfiguration<any> => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Custo', data: custoSem,
          backgroundColor: c.brand + '40', borderColor: c.brand, borderWidth: 1, borderRadius: 4,
          yAxisID: 'y', order: 2,
        },
        {
          type: 'line', label: 'km/L', data: kmlSem,
          borderColor: c.ok, backgroundColor: c.ok, borderWidth: 2, tension: .35,
          pointRadius: 3, pointBackgroundColor: c.ok, yAxisID: 'y1', order: 1,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ctx.dataset.yAxisID === 'y'
              ? ' R$ ' + Number(ctx.parsed.y).toLocaleString('pt-BR')
              : ' ' + String(ctx.parsed.y).replace('.', ',') + ' km/L',
          },
        },
      },
      scales: {
        x: { grid: { color: c.line, drawTicks: false }, ticks: { color: c.dim, font: { size: 11 } } },
        y: {
          position: 'left', grid: { color: c.line },
          ticks: { color: c.dim, font: { size: 11 }, callback: (v: any) => 'R$ ' + (Number(v) / 1000) + 'k' },
          beginAtZero: true,
        },
        y1: {
          position: 'right', grid: { drawOnChartArea: false },
          ticks: { color: c.ok, font: { size: 11 } },
          suggestedMin: 6, suggestedMax: 13,
        },
      },
    },
  });
}

/** Doughnut de disponibilidade da frota — rodando / em manutenção / parado. */
export function buildDisponibilidadeChart(counts: [number, number, number]) {
  return (c: ThemeColors): ChartConfiguration<any> => ({
    type: 'doughnut',
    data: {
      labels: ['Rodando', 'Em manutenção', 'Parado'],
      datasets: [{ data: counts, backgroundColor: [c.ok, c.warn, c.dim], borderColor: c.surf, borderWidth: 3, hoverOffset: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '64%',
      plugins: {
        legend: { position: 'bottom', labels: { color: c.mut, boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { callbacks: { label: (ctx: any) => ' ' + ctx.label + ': ' + ctx.parsed + ' veículos' } },
      },
    },
  });
}
