import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-papeleria',
  templateUrl: './formulario-papeleria.component.html',
  styleUrls: ['./formulario-papeleria.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioPapeleriaComponent {
  @Input() parentForm!: FormGroup;
}
