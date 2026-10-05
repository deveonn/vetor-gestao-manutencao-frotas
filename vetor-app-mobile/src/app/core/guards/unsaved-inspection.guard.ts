import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { InspectionService } from '../services/inspection.service';

export const unsavedInspectionGuard: CanDeactivateFn<unknown> = async (
  _component,
  _currentRoute,
  _currentState,
  nextState,
) => {
  const inspection = inject(InspectionService);
  const alertCtrl = inject(AlertController);

  const goingElsewhereInFlow = nextState?.url?.startsWith('/vistoria') ?? false;
  if (goingElsewhereInFlow || !inspection.hasUnsavedChanges()) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    alertCtrl
      .create({
        header: 'sair da vistoria?',
        message: 'o que você já marcou nesta vistoria será perdido.',
        buttons: [
          { text: 'continuar vistoria', role: 'cancel', handler: () => resolve(false) },
          {
            text: 'sair e descartar',
            role: 'destructive',
            handler: () => {
              void inspection.descartar();
              resolve(true);
            },
          },
        ],
      })
      .then((alert) => alert.present());
  });
};
