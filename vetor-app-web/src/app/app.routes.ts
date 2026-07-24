import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'painel', pathMatch: 'full' },
      { path: 'painel', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'veiculos', loadComponent: () => import('./features/vehicles/vehicle-list.component').then((m) => m.VehicleListComponent) },
      { path: 'veiculos/:placa', loadComponent: () => import('./features/vehicles/vehicle-detail.component').then((m) => m.VehicleDetailComponent) },
      { path: 'combustivel', loadComponent: () => import('./features/fuel/fuel.component').then((m) => m.FuelComponent) },
      { path: 'manutencao', loadComponent: () => import('./features/maintenance/maintenance.component').then((m) => m.MaintenanceComponent) },
      { path: 'pneus', loadComponent: () => import('./features/tires/tires.component').then((m) => m.TiresComponent) },
      { path: 'motoristas', loadComponent: () => import('./features/drivers/drivers.component').then((m) => m.DriversComponent) },
      { path: 'relatorios', loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent) },
      { path: 'conta', loadComponent: () => import('./features/account/account.component').then((m) => m.AccountComponent) },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
