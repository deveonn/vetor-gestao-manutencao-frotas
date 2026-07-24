import { Component, inject } from '@angular/core';
import { FleetStore } from '../../core/fleet.store';

@Component({
  selector: 'vetor-tires',
  templateUrl: './tires.component.html',
  styleUrl: './tires.component.scss',
})
export class TiresComponent {
  store = inject(FleetStore);
}
