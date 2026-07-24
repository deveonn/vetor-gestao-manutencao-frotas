import { Component, inject } from '@angular/core';
import { ModalService } from '../../core/modal.service';
import { DeleteVehicleModalComponent } from './delete-vehicle-modal.component';
import { FuelFormModalComponent } from './fuel-form-modal.component';
import { DriverFormModalComponent } from './driver-form-modal.component';
import { VehicleFormModalComponent } from './vehicle-form-modal.component';
import { VehicleSearchModalComponent } from './vehicle-search-modal.component';

@Component({
  selector: 'vetor-modal-host',
  imports: [DeleteVehicleModalComponent, FuelFormModalComponent, DriverFormModalComponent, VehicleFormModalComponent, VehicleSearchModalComponent],
  template: `
    @switch (modal.active()) {
      @case ('excluir') { <vetor-delete-vehicle-modal /> }
      @case ('abast') { <vetor-fuel-form-modal /> }
      @case ('mot') { <vetor-driver-form-modal /> }
      @case ('veic') { <vetor-vehicle-form-modal /> }
      @case ('buscaVeic') { <vetor-vehicle-search-modal /> }
    }
  `,
})
export class ModalHostComponent {
  modal = inject(ModalService);
}
