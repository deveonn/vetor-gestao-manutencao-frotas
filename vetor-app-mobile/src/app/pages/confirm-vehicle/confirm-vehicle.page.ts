import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { VehicleService } from '../../core/services/vehicle.service';
import { InspectionService } from '../../core/services/inspection.service';
import { VEHICLE_TYPE_META, agree } from '../../core/models/vehicle-type.model';

@Component({
  selector: 'app-confirm-vehicle',
  templateUrl: './confirm-vehicle.page.html',
  styleUrl: './confirm-vehicle.page.scss',
})
export class ConfirmVehiclePage {
  constructor(
    readonly vehicle: VehicleService,
    private inspection: InspectionService,
    private router: Router,
    private alertCtrl: AlertController,
  ) {}

  get typeMeta() {
    const v = this.vehicle.todaysVehicle();
    return v ? VEHICLE_TYPE_META[v.type] : null;
  }

  get demonstrativePronoun(): string {
    const meta = this.typeMeta;
    return meta ? agree(meta, 'esse', 'essa') : 'esse';
  }

  confirm(): void {
    const v = this.vehicle.todaysVehicle();
    if (!v) return;
    this.inspection.start(v.id, v.plate, v.type);
    this.router.navigateByUrl('/vistoria');
  }

  async chooseAnother(): Promise<void> {
    const meta = this.typeMeta;
    const artigoDe = meta ? meta.articleO : 'o veículo';
    const vinculado = meta ? agree(meta, 'vinculado', 'vinculada') : 'vinculado';
    const alert = await this.alertCtrl.create({
      header: 'trocar de veículo',
      message: `por enquanto só ${artigoDe} de hoje está ${vinculado} a você. fale com o gestor da frota para trocar.`,
      buttons: ['entendi'],
    });
    await alert.present();
  }

  back(): void {
    this.router.navigateByUrl('/tabs');
  }
}
