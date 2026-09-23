import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { unsavedInspectionGuard } from './core/guards/unsaved-inspection.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/tabs/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'historico',
        loadComponent: () => import('./pages/tabs/history/history.page').then((m) => m.HistoryPage),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/tabs/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  {
    path: 'confirmar-veiculo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/confirm-vehicle/confirm-vehicle.page').then((m) => m.ConfirmVehiclePage),
  },
  {
    path: 'vistoria',
    canActivate: [authGuard],
    canDeactivate: [unsavedInspectionGuard],
    loadComponent: () => import('./pages/checklist/checklist.page').then((m) => m.ChecklistPage),
  },
  {
    path: 'vistoria/avaliar/:stepId/:subIndex',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checklist-rate/checklist-rate.page').then((m) => m.ChecklistRatePage),
  },
  {
    path: 'vistoria/revisao',
    canActivate: [authGuard],
    canDeactivate: [unsavedInspectionGuard],
    loadComponent: () => import('./pages/review/review.page').then((m) => m.ReviewPage),
  },
  {
    path: 'vistoria/confirmacao',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/confirmation/confirmation.page').then((m) => m.ConfirmationPage),
  },
  { path: '**', redirectTo: 'splash' },
];
