import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BaseChartDirective } from 'ng2-charts';

import { ReportesComponent } from './reportes.component';

@NgModule({
  declarations: [
    ReportesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BaseChartDirective
  ],
  exports: [
    ReportesComponent
  ]
})
export class ReportesModule { }
