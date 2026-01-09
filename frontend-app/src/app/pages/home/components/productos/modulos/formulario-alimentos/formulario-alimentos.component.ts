import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-formulario-alimentos',
  templateUrl: './formulario-alimentos.component.html',
  styleUrls: ['./formulario-alimentos.component.scss'],
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class FormularioAlimentosComponent {
  @Input() parentForm!: FormGroup;
}
