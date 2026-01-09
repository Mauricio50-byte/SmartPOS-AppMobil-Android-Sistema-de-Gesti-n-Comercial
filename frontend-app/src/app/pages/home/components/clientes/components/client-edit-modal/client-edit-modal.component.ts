import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from 'src/app/core/models/cliente';

@Component({
  selector: 'app-client-edit-modal',
  templateUrl: './client-edit-modal.component.html',
  styleUrls: ['./client-edit-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule]
})
export class ClientEditModalComponent implements OnInit {
  @Input() cliente!: Cliente;
  editForm!: FormGroup;

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.editForm = this.fb.group({
      nombre: [this.cliente.nombre, [Validators.required]],
      telefono: [this.cliente.telefono],
      cedula: [this.cliente.cedula],
      correo: [this.cliente.correo],
      direccion: [this.cliente.direccion],
      creditoMaximo: [this.cliente.creditoMaximo || 0],
      saldoDeuda: [this.cliente.saldoDeuda || 0] // Allow editing balance
    });
  }

  cancelar() {
    this.modalController.dismiss(null, 'cancel');
  }

  guardar() {
    if (this.editForm.valid) {
      this.modalController.dismiss(this.editForm.value, 'confirm');
    }
  }
}
