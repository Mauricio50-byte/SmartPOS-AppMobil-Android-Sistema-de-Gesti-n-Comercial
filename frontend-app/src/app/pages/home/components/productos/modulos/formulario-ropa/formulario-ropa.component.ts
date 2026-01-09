import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-ropa',
  templateUrl: './formulario-ropa.component.html',
  styleUrls: ['./formulario-ropa.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioRopaComponent {
  @Input() parentForm!: FormGroup;
}
