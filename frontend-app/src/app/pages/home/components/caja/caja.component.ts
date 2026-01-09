import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { CajaService } from 'src/app/core/services/caja.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Caja, MovimientoCaja } from 'src/app/core/models/caja';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class CajaComponent implements OnInit {
  caja: Caja | null = null;
  //hola moundo
  loading = false;
  movimientos: MovimientoCaja[] = [];
  saldoTransferencia = 0;

  constructor(
    private cajaService: CajaService,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.cargarEstadoCaja();
  }

  ionViewWillEnter() {
    this.cargarEstadoCaja();
  }

  hasPermission(permiso: string): boolean {
    return this.authService.hasPermission(permiso);
  }

  async cargarEstadoCaja() {
    if (!this.hasPermission('ABRIR_CAJA') && !this.hasPermission('VER_FINANZAS')) {
       // Si no tiene permisos, no cargamos nada o mostramos error visual
       return;
    }

    this.loading = true;
    this.cajaService.obtenerEstadoCaja().subscribe({
      next: (data) => {
        this.caja = data;
        if (this.caja && this.caja.movimientos) {
            this.movimientos = this.caja.movimientos;
            this.calcularSaldoTransferencia();
        }
        this.loading = false;
      },
      error: (err) => {
        // 404 significa no hay caja abierta, lo cual es normal
        this.caja = null;
        this.movimientos = [];
        this.saldoTransferencia = 0;
        this.loading = false;
      }
    });
  }

  calcularSaldoTransferencia() {
    this.saldoTransferencia = this.movimientos
      .filter(m => m.metodoPago === 'TRANSFERENCIA')
      .reduce((acc, m) => {
        const isIngreso = m.tipo.includes('INGRESO') || m.tipo.includes('VENTA') || m.tipo.includes('ABONO');
        return isIngreso ? acc + Number(m.monto) : acc - Number(m.monto);
      }, 0);
  }

  async abrirCaja() {
    if (!this.hasPermission('ABRIR_CAJA')) {
      this.mostrarToast('No tienes permiso para abrir caja.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Abrir Caja',
      inputs: [
        {
          name: 'montoInicial',
          type: 'number',
          placeholder: 'Monto Inicial',
          min: 0
        },
        {
          name: 'observaciones',
          type: 'text',
          placeholder: 'Observaciones (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Abrir',
          handler: (data) => {
            if (!data.montoInicial && data.montoInicial !== 0) {
              this.mostrarToast('El monto inicial es requerido', 'warning');
              return false;
            }
            this.ejecutarAbrirCaja(Number(data.montoInicial), data.observaciones);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async ejecutarAbrirCaja(montoInicial: number, observaciones: string) {
    const loading = await this.loadingController.create({ message: 'Abriendo caja...' });
    await loading.present();

    this.cajaService.abrirCaja(montoInicial, observaciones).subscribe({
      next: (caja) => {
        loading.dismiss();
        this.mostrarToast('Caja abierta exitosamente', 'success');
        this.cargarEstadoCaja();
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al abrir caja', 'danger');
      }
    });
  }

  async cerrarCaja() {
    if (!this.caja) return;
    if (!this.hasPermission('CERRAR_CAJA')) {
      this.mostrarToast('No tienes permiso para cerrar caja.', 'warning');
      return;
    }

    // Calcular montos esperados para mostrar en el alert? Sería ideal, pero por ahora simple.
    const saldoSistema = this.caja.resumen?.saldoActual || 0;

    const alert = await this.alertController.create({
      header: 'Cerrar Caja',
      message: `El saldo esperado por el sistema es: $${saldoSistema.toLocaleString()}`,
      inputs: [
        {
          name: 'montoFinal',
          type: 'number',
          placeholder: 'Monto Real en Caja',
          min: 0
        },
        {
          name: 'observaciones',
          type: 'text',
          placeholder: 'Observaciones'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Caja',
          cssClass: 'alert-button-confirm',
          handler: (data) => {
             if (!data.montoFinal && data.montoFinal !== 0) {
              this.mostrarToast('El monto final es requerido', 'warning');
              return false;
            }
            this.ejecutarCerrarCaja(Number(data.montoFinal), data.observaciones);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async ejecutarCerrarCaja(montoFinal: number, observaciones: string) {
    const loading = await this.loadingController.create({ message: 'Cerrando caja...' });
    await loading.present();

    this.cajaService.cerrarCaja(montoFinal, observaciones).subscribe({
      next: (caja) => {
        loading.dismiss();
        this.mostrarToast('Caja cerrada exitosamente', 'success');
        this.caja = null; // Limpiar estado local
        this.movimientos = [];
        this.cargarEstadoCaja(); // Recargar para confirmar estado
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al cerrar caja', 'danger');
      }
    });
  }

  async registrarMovimiento(tipo: 'INGRESO' | 'EGRESO') {
    if (!this.hasPermission('REGISTRAR_MOVIMIENTO')) {
      this.mostrarToast('No tienes permiso para registrar movimientos manuales.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: `Registrar ${tipo}`,
      inputs: [
        {
          name: 'monto',
          type: 'number',
          placeholder: 'Monto',
          min: 0
        },
        {
          name: 'descripcion',
          type: 'text',
          placeholder: 'Descripción / Motivo'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Registrar',
          handler: (data) => {
             if (!data.monto) {
              this.mostrarToast('El monto es requerido', 'warning');
              return false;
            }
             if (!data.descripcion) {
              this.mostrarToast('La descripción es requerida', 'warning');
              return false;
            }
            this.ejecutarMovimiento(tipo, Number(data.monto), data.descripcion);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async ejecutarMovimiento(tipo: 'INGRESO' | 'EGRESO', monto: number, descripcion: string) {
    const loading = await this.loadingController.create({ message: 'Registrando...' });
    await loading.present();

    // Movimientos manuales por defecto son EFECTIVO en este flujo simple
    // Podríamos agregar un selector de método de pago si fuera necesario
    this.cajaService.registrarMovimiento(tipo, monto, descripcion).subscribe({
      next: () => {
        loading.dismiss();
        this.mostrarToast('Movimiento registrado', 'success');
        this.cargarEstadoCaja();
      },
      error: (err) => {
        loading.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar movimiento', 'danger');
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
