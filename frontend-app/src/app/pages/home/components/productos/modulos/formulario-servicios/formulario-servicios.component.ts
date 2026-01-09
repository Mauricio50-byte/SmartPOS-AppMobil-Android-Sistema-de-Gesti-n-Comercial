import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-servicios',
  templateUrl: './formulario-servicios.component.html',
  styleUrls: ['./formulario-servicios.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioServiciosComponent {
  @Input() parentForm!: FormGroup;
}
