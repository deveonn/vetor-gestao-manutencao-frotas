import { Component, inject } from '@angular/core';
import { ModalService } from '../../core/modal.service';
import { DeleteVehicleModalComponent } from './delete-vehicle-modal.component';
import { FuelFormModalComponent } from './fuel-form-modal.component';
import { DriverAccessModalComponent } from './driver-access-modal.component';
import { MaintenanceFormModalComponent } from './maintenance-form-modal.component';
import { MaintenanceDoneModalComponent } from './maintenance-done-modal.component';
import { DriverFormModalComponent } from './driver-form-modal.component';
import { FornecedorFormModalComponent } from './fornecedor-form-modal.component';
import { VehicleFormModalComponent } from './vehicle-form-modal.component';
import { VehicleSearchModalComponent } from './vehicle-search-modal.component';

@Component({
  selector: 'vetor-modal-host',
  imports: [DeleteVehicleModalComponent, FuelFormModalComponent, DriverFormModalComponent, DriverAccessModalComponent, MaintenanceFormModalComponent, MaintenanceDoneModalComponent, FornecedorFormModalComponent, VehicleFormModalComponent, VehicleSearchModalComponent],
  template: `
    @switch (modal.active()) {
      @case ('excluir') { <vetor-delete-vehicle-modal /> }
      @case ('abast') { <vetor-fuel-form-modal /> }
      @case ('mot') { <vetor-driver-form-modal /> }
      @case ('acesso') { <vetor-driver-access-modal /> }
      @case ('manut') { <vetor-maintenance-form-modal /> }
      @case ('concluir') { <vetor-maintenance-done-modal /> }
      @case ('fornecedor') { <vetor-fornecedor-form-modal /> }
      @case ('veic') { <vetor-vehicle-form-modal /> }
      @case ('buscaVeic') { <vetor-vehicle-search-modal /> }
    }
  `,
})
export class ModalHostComponent {
  modal = inject(ModalService);
}
