import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-farmacia',
  templateUrl: './formulario-farmacia.component.html',
  styleUrls: ['./formulario-farmacia.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioFarmaciaComponent {
  @Input() parentForm!: FormGroup;
}
