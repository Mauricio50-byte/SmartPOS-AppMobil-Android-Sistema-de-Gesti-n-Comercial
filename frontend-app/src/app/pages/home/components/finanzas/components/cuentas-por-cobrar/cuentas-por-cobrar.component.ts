import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { DeudaService } from 'src/app/core/services/deuda.service';
import { Deuda } from 'src/app/core/models/deuda'; // Adjust path if needed
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cuentas-por-cobrar',
  templateUrl: './cuentas-por-cobrar.component.html',
  styleUrls: ['./cuentas-por-cobrar.component.scss'],
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, IonicModule, FormsModule]
})
export class CuentasPorCobrarComponent implements OnInit {
  deudas: Deuda[] = [];
  filteredDeudas: Deuda[] = [];
  searchTerm: string = '';
  filterEstado: string = 'PENDIENTE';
  loading: boolean = false;

  constructor(
    private deudaService: DeudaService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ searchOutline, filterOutline, cashOutline, alertCircleOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.cargarDeudas();
  }

  cargarDeudas() {
    this.loading = true;
    this.deudaService.listarDeudas({ estado: this.filterEstado === 'TODOS' ? undefined : this.filterEstado })
      .subscribe({
        next: (data) => {
          this.deudas = data;
          this.filterDeudas();
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.mostrarToast('Error al cargar deudas', 'danger');
          this.loading = false;
        }
      });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterDeudas();
  }

  onFilterChange(event: any) {
    this.filterEstado = event.detail.value;
    this.cargarDeudas();
  }

  filterDeudas() {
    if (!this.searchTerm) {
      this.filteredDeudas = this.deudas;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredDeudas = this.deudas.filter(d => 
      d.cliente?.nombre.toLowerCase().includes(term) || 
      d.cliente?.cedula?.includes(term)
    );
  }

  async registrarAbono(deuda: Deuda) {
    const alert = await this.alertController.create({
      header: 'Registrar Abono',
      subHeader: `Cliente: ${deuda.cliente?.nombre}`,
      message: `Saldo pendiente: $${deuda.saldoPendiente}`,
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Monto a abonar',
          min: 1,
          max: deuda.saldoPendiente
        },
        {
          name: 'nota',
          type: 'text',
          placeholder: 'Nota (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Abonar',
          handler: (data) => {
            const monto = parseFloat(data.monto);
            if (!monto || monto <= 0) {
              this.mostrarToast('Monto inválido', 'warning');
              return false;
            }
            if (monto > deuda.saldoPendiente) {
              this.mostrarToast('El monto excede el saldo pendiente', 'warning');
              return false;
            }
            this.procesarAbono(deuda.id, monto, data.nota);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  procesarAbono(deudaId: number, monto: number, nota: string) {
    this.deudaService.registrarAbono(deudaId, {
      monto,
      metodoPago: 'EFECTIVO', // Could be extended to select method
      nota
    }).subscribe({
      next: () => {
        this.mostrarToast('Abono registrado exitosamente', 'success');
        this.cargarDeudas();
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al registrar abono', 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}
