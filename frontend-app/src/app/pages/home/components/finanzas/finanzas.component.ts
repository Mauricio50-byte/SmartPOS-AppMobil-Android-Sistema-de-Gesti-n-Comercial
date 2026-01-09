import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CuentasPorCobrarComponent } from './components/cuentas-por-cobrar/cuentas-por-cobrar.component';
import { CuentasPorPagarComponent } from './components/cuentas-por-pagar/cuentas-por-pagar.component';
import { CajaComponent } from '../caja/caja.component';
import { addIcons } from 'ionicons';
import { walletOutline, cashOutline, cardOutline, fileTrayFullOutline } from 'ionicons/icons';

@Component({
  selector: 'app-finanzas',
  templateUrl: './finanzas.component.html',
  styleUrls: ['./finanzas.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, CuentasPorCobrarComponent, CuentasPorPagarComponent, CajaComponent]
})
export class FinanzasComponent {
  segment: 'caja' | 'por-cobrar' | 'por-pagar' = 'caja';

  constructor() {
    addIcons({ walletOutline, cashOutline, cardOutline, fileTrayFullOutline });
  }

  segmentChanged(event: any) {
    this.segment = event.detail.value;
  }
}
