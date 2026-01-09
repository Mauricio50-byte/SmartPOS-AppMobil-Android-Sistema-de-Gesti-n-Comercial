import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { IonicModule, AlertController, ToastController, ModalController } from '@ionic/angular';
import { GastoService } from 'src/app/core/services/gasto.service';
import { Gasto } from 'src/app/core/models/gasto';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, addOutline, cashOutline, trashOutline } from 'ionicons/icons';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-cuentas-por-pagar',
  templateUrl: './cuentas-por-pagar.component.html',
  styleUrls: ['./cuentas-por-pagar.component.scss'],
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, IonicModule, FormsModule, ReactiveFormsModule]
})
export class CuentasPorPagarComponent implements OnInit {
  gastos: Gasto[] = [];
  filteredGastos: Gasto[] = [];
  searchTerm: string = '';
  filterEstado: string = 'PENDIENTE';
  loading: boolean = false;
  showForm: boolean = false;
  
  gastoForm: FormGroup;

  constructor(
    private gastoService: GastoService,
    private alertController: AlertController,
    private toastController: ToastController,
    private fb: FormBuilder
  ) {
    addIcons({ searchOutline, filterOutline, addOutline, cashOutline, trashOutline });
    this.gastoForm = this.fb.group({
      proveedor: ['', Validators.required],
      concepto: ['', Validators.required],
      montoTotal: [null, [Validators.required, Validators.min(0.01)]],
      fechaVencimiento: [''],
      categoria: ['OPERATIVO']
    });
  }

  ngOnInit() {
    this.cargarGastos();
  }

  cargarGastos() {
    this.loading = true;
    this.gastoService.listarGastos({ estado: this.filterEstado === 'TODOS' ? undefined : this.filterEstado })
      .subscribe({
        next: (data) => {
          this.gastos = data;
          this.filterGastos();
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.mostrarToast('Error al cargar gastos', 'danger');
          this.loading = false;
        }
      });
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    this.filterGastos();
  }

  onFilterChange(event: any) {
    this.filterEstado = event.detail.value;
    this.cargarGastos();
  }

  filterGastos() {
    if (!this.searchTerm) {
      this.filteredGastos = this.gastos;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredGastos = this.gastos.filter(g => 
      g.proveedor.toLowerCase().includes(term) || 
      g.concepto.toLowerCase().includes(term)
    );
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.gastoForm.reset({ categoria: 'OPERATIVO' });
  }

  guardarGasto() {
    if (this.gastoForm.invalid) {
      this.gastoForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.gastoService.crearGasto(this.gastoForm.value).subscribe({
      next: () => {
        this.mostrarToast('Gasto registrado exitosamente', 'success');
        this.toggleForm();
        this.cargarGastos();
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al registrar gasto', 'danger');
        this.loading = false;
      }
    });
  }

  async registrarPago(gasto: Gasto) {
    const alert = await this.alertController.create({
      header: 'Registrar Pago',
      subHeader: `Proveedor: ${gasto.proveedor}`,
      message: `Saldo pendiente: $${gasto.saldoPendiente}`,
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Monto a pagar',
          min: 1,
          max: gasto.saldoPendiente
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
          text: 'Pagar',
          handler: (data) => {
            const monto = parseFloat(data.monto);
            if (!monto || monto <= 0) {
              this.mostrarToast('Monto inválido', 'warning');
              return false;
            }
            if (monto > gasto.saldoPendiente) {
              this.mostrarToast('El monto excede el saldo pendiente', 'warning');
              return false;
            }
            this.procesarPago(gasto.id, monto, data.nota);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  procesarPago(gastoId: number, monto: number, nota: string) {
    this.gastoService.registrarPago(gastoId, {
      monto,
      metodoPago: 'EFECTIVO',
      nota
    }).subscribe({
      next: () => {
        this.mostrarToast('Pago registrado exitosamente', 'success');
        this.cargarGastos();
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al registrar pago', 'danger');
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
