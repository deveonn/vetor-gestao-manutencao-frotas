import { Component } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { VehicleService } from '../../../core/services/vehicle.service';
import { Vehicle } from '../../../core/models/vehicle.model';
import { VEHICLE_TYPE_META } from '../../../core/models/vehicle-type.model';

@Component({
  selector: 'app-tabs-header',
  templateUrl: './tabs-header.component.html',
  styleUrl: './tabs-header.component.scss',
})
export class TabsHeaderComponent {
  constructor(
    readonly session: SessionService,
    readonly vehicle: VehicleService,
  ) {}

  typeMeta(v: Vehicle) {
    return VEHICLE_TYPE_META[v.type];
  }
}
