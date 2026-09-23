import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/auth.service';
import { FleetStore } from '../core/fleet.store';
import { ThemeService } from '../core/theme.service';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

const NAV_DEF: NavItem[] = [
  { id: 'painel', label: 'Visão geral', icon: 'space_dashboard' },
  { id: 'veiculos', label: 'Veículos', icon: 'local_shipping' },
  { id: 'combustivel', label: 'Combustível', icon: 'local_gas_station' },
  { id: 'manutencao', label: 'Manutenção', icon: 'build' },
  { id: 'pneus', label: 'Pneus e vistorias', icon: 'tire_repair' },
  { id: 'motoristas', label: 'Motoristas', icon: 'badge' },
  { id: 'relatorios', label: 'Relatórios', icon: 'monitoring' },
];

const TITLES: Record<string, string> = {
  painel: 'Visão geral', veiculos: 'Veículos', combustivel: 'Combustível', manutencao: 'Manutenção',
  pneus: 'Pneus e vistorias', motoristas: 'Motoristas', relatorios: 'Relatórios', conta: 'Configurações da conta',
};

@Component({
  selector: 'vetor-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  store = inject(FleetStore);
  theme = inject(ThemeService);

  nav = NAV_DEF;
  menuOpen = signal(false);
  currentUrl = signal(this.router.url);

  constructor() {
    this.store.loadAccount().catch(() => {});
    this.store.loadHapolo().catch(() => {});
    this.store.loadVehicles();
    this.store.loadDrivers().catch(() => {});
    this.store.loadFuel().catch(() => {});
    this.store.loadMaintenance().catch(() => {});
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.currentUrl.set(this.router.url);
      this.menuOpen.set(false);
    });
  }

  currentSegment = computed(() => {
    const seg = this.currentUrl().split('/').filter(Boolean)[0] ?? 'painel';
    return seg;
  });

  screenTitle = computed(() => TITLES[this.currentSegment()] ?? '');

  initials = computed(() => this.store.account().nome
    .split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase());

  alertCount = computed(() => this.store.alertsEnriched().length);

  isActive(id: string): boolean {
    const seg = this.currentSegment();
    return seg === id || (id === 'veiculos' && seg === 'veiculos');
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  irConta(): void {
    this.menuOpen.set(false);
    this.router.navigate(['/conta']);
  }

  sair(): void {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
