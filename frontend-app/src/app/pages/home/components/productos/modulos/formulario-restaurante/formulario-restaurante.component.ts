import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-restaurante',
  templateUrl: './formulario-restaurante.component.html',
  styleUrls: ['./formulario-restaurante.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioRestauranteComponent {
  @Input() parentForm!: FormGroup;
}
