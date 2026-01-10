import { Component, OnInit } from '@angular/core';
import { VentaServices } from 'src/app/core/services/venta.service';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { ClientesServices } from 'src/app/core/services/cliente.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Venta } from 'src/app/core/models/venta';
import { Producto } from 'src/app/core/models/producto';
import { Cliente } from 'src/app/core/models/cliente';
import { AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';

@Component({
  standalone: false,
  selector: 'app-ventas',
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.scss'],
})
export class VentasComponent implements OnInit {
  ventaForm: FormGroup;
  allProductos: Producto[] = [];
  productos: Producto[] = [];
  filteredProductos: Producto[] = [];
  clientes: Cliente[] = [];
  searchTerm: string = '';
  private allowedTipos: Set<string> | null = null;
  private moduloIdToTipo: Record<string, string> = {
    ropa: 'ROPA',
    alimentos: 'ALIMENTO',
    servicios: 'SERVICIO',
    farmacia: 'FARMACIA',
    papeleria: 'PAPELERIA',
    restaurante: 'RESTAURANTE'
  };

  // Configuración de venta
  tipoVenta: 'CONTADO' | 'FIADO' = 'CONTADO';
  clienteSeleccionado: Cliente | null = null;
  mostrarRegistroCliente: boolean = false;
  
  // Vista móvil (catalogo o carrito)
  cartVisibleMobile: boolean = false;
  
  isLoading: boolean = false;

  // Usuario actual
  currentUserId: number = 1;

  constructor(
    private ventaService: VentaServices,
    private productoService: ProductosServices,
    private clienteService: ClientesServices,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private fb: FormBuilder
  ) {
    this.ventaForm = this.fb.group({
      fecha: [new Date().toISOString(), Validators.required],
      usuarioId: [this.currentUserId, Validators.required],
      total: [0, [Validators.required, Validators.min(0)]],
      clienteId: [null],
      metodoPago: ['EFECTIVO', Validators.required],
      estadoPago: ['PAGADO', Validators.required],
      montoPagado: [0],
      registrarCliente: [false],
      datosCliente: this.fb.group({
        nombre: ['', Validators.required],
        telefono: ['', Validators.required],
        cedula: [''],
        correo: ['', [Validators.email]],
        creditoMaximo: [0],
        diasCredito: [30]
      }),
      detalles: this.fb.array([], Validators.required)
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadClientes();
    this.loadCurrentUser();
    this.loadAllowedModules();

    // Suscribirse a nuevos clientes
    this.clienteService.clienteCreado$.subscribe(cliente => {
      this.loadClientes(); // Recargar lista
      // Si el cliente fue creado desde este componente, seleccionarlo
      if (this.mostrarRegistroCliente) {
        this.onClienteSeleccionado(cliente);
      }
    });

    // Suscribirse a cambios en productos (creación, edición, eliminación)
    this.productoService.productoChanged$.subscribe(() => {
      this.loadProducts();
    });

    // Inicializar el grupo de datos de cliente como deshabilitado
    this.datosClienteGroup.disable();
  }

  loadCurrentUser() {
    this.authService.getPerfil$().subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.ventaForm.patchValue({ usuarioId: user.id });
      }
    });
  }

  loadAllowedModules() {
    this.authService.getPerfil$().subscribe(user => {
      const modulos = Array.isArray(user?.modulos) ? user!.modulos : [];
      const tipos = new Set<string>(['GENERAL']);
      for (const moduloId of modulos) {
        const tipo = this.moduloIdToTipo[String(moduloId).toLowerCase()];
        if (tipo) tipos.add(tipo);
      }
      this.allowedTipos = tipos;
      this.aplicarFiltroModulosEnProductos();
    });
  }

  get detalles(): FormArray {
    return this.ventaForm.get('detalles') as FormArray;
  }

  get totalControl(): AbstractControl {
    return this.ventaForm.get('total')!;
  }

  get paymentMethodControl(): AbstractControl {
    return this.ventaForm.get('metodoPago')!;
  }

  get datosClienteGroup(): FormGroup {
    return this.ventaForm.get('datosCliente') as FormGroup;
  }

  loadProducts() {
    this.isLoading = true;
    this.productoService.listarProductos().subscribe({
      next: (data) => {
        this.allProductos = data || [];
        this.productos = this.allProductos;
        this.filteredProductos = this.allProductos;
        this.aplicarFiltroModulosEnProductos();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando productos', err);
        this.mostrarToast('Error al cargar productos', 'danger');
        this.isLoading = false;
      }
    });
  }

  loadClientes() {
    this.clienteService.listarClientes().subscribe({
      next: (data) => {
        this.clientes = data.filter(c => c.activo !== false);
      },
      error: (err) => {
        console.error('Error cargando clientes', err);
      }
    });
  }

  onSearch(event: any) {
    const term = event.target.value;
    this.searchTerm = term;
    if (!term) {
      this.filteredProductos = this.productos;
      return;
    }

    this.filteredProductos = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(term.toLowerCase())
    );
  }

  private aplicarFiltroModulosEnProductos() {
    if (!this.allowedTipos) {
      this.productos = this.allProductos;
    } else {
      this.productos = (this.allProductos || []).filter(p => this.allowedTipos!.has(String(p.tipo || 'GENERAL').toUpperCase()));
    }
    const term = this.searchTerm;
    if (!term) {
      this.filteredProductos = this.productos;
      return;
    }
    const lower = String(term).toLowerCase();
    this.filteredProductos = this.productos.filter(p => p.nombre.toLowerCase().includes(lower));
  }

  addToCart(product: Producto) {
    const existingIndex = this.detalles.controls.findIndex(
      (ctrl) => ctrl.value.product.id === product.id
    );

    const precioVenta = Number(product.precioVenta) || 0;

    if (existingIndex > -1) {
      const control = this.detalles.at(existingIndex);
      const newQuantity = Number(control.value.quantity) + 1;
      control.patchValue({
        quantity: newQuantity,
        total: newQuantity * precioVenta
      });
    } else {
      const detalleGroup = this.fb.group({
        product: [product],
        productoId: [product.id, Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        precioUnitario: [precioVenta, Validators.required],
        total: [precioVenta, Validators.required]
      });
      this.detalles.push(detalleGroup);
    }

    this.searchTerm = '';
    this.filteredProductos = this.productos;
    this.calculateTotal();
    this.mostrarToast('Producto agregado', 'success', 1000);
  }

  toggleCartMobile() {
    this.cartVisibleMobile = !this.cartVisibleMobile;
  }

  removeFromCart(index: number) {
    this.detalles.removeAt(index);
    this.calculateTotal();
  }

  updateQuantity(event: { item: any, quantity: number }, index: number) {
    const control = this.detalles.at(index);
    if (control) {
      const product = control.value.product;
      control.patchValue({
        quantity: event.quantity,
        total: event.quantity * product.precioVenta
      });
      this.calculateTotal();
    }
  }

  calculateTotal() {
    const total = this.detalles.controls.reduce((acc, ctrl) => acc + ctrl.value.total, 0);
    this.ventaForm.patchValue({ total: total });
  }

  setPaymentMethod(method: string) {
    this.ventaForm.patchValue({ metodoPago: method });
  }

  setTipoVenta(value: any) {
    const tipo = value as 'CONTADO' | 'FIADO';
    this.tipoVenta = tipo;

    if (tipo === 'CONTADO') {
      this.ventaForm.patchValue({
        estadoPago: 'PAGADO'
      });
      // No limpiamos el cliente aquí para permitir que sea opcional en contado
      this.mostrarRegistroCliente = false;
      this.ventaForm.patchValue({ registrarCliente: false });
      this.datosClienteGroup.disable();
    } else {
      this.ventaForm.patchValue({
        estadoPago: 'FIADO'
      });
    }
  }

  onClienteSeleccionado(cliente: Cliente | null) {
    this.clienteSeleccionado = cliente;
    if (cliente) {
      this.ventaForm.patchValue({
        clienteId: cliente.id,
        registrarCliente: false
      });
      this.datosClienteGroup.disable();
    } else {
      this.ventaForm.patchValue({
        clienteId: null
      });
    }
    this.mostrarRegistroCliente = false;
    if (!cliente) {
       this.datosClienteGroup.disable();
    }
  }

  cancelarRegistroCliente() {
    this.mostrarRegistroCliente = false;
    this.ventaForm.patchValue({ registrarCliente: false });
    this.datosClienteGroup.disable();
  }

  async mostrarModalRegistroCliente() {
    const alert = await this.alertController.create({
      header: '¿Registrar Cliente?',
      message: '¿El cliente desea registrarse para acumular puntos y tener acceso a crédito?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            this.mostrarRegistroCliente = false;
            this.ventaForm.patchValue({ registrarCliente: false });
            this.datosClienteGroup.disable();
          }
        },
        {
          text: 'Sí, registrar',
          handler: () => {
            this.mostrarRegistroCliente = true;
            this.ventaForm.patchValue({ registrarCliente: true });
            this.datosClienteGroup.enable();
          }
        }
      ]
    });

    await alert.present();
  }

  async registrarNuevoCliente(datos: any) {
    const loading = await this.loadingController.create({
      message: 'Registrando cliente...'
    });
    await loading.present();

    this.clienteService.crearCliente(datos).subscribe({
      next: async (nuevoCliente) => {
        await loading.dismiss();
        await this.mostrarAlerta('Cliente Registrado', 'El cliente ha sido registrado exitosamente.');
        // La suscripción en ngOnInit se encargará de seleccionarlo y cerrar el formulario
      },
      error: async (err) => {
        await loading.dismiss();
        console.error('Error al registrar cliente', err);
        await this.mostrarAlerta('Error', 'No se pudo registrar el cliente');
      }
    });
  }

  async validarCreditoDisponible(): Promise<boolean> {
    if (!this.clienteSeleccionado) return false;

    const loading = await this.loadingController.create({
      message: 'Validando crédito...'
    });
    await loading.present();

    return new Promise((resolve) => {
      this.clienteService.validarCredito(
        this.clienteSeleccionado!.id,
        this.totalControl.value
      ).subscribe({
        next: async (validacion) => {
          await loading.dismiss();

          if (!validacion.disponible) {
            await this.mostrarAlerta(
              'Crédito Insuficiente',
              `El cliente no tiene crédito suficiente.\n\n` +
              `Crédito máximo: $${validacion.creditoMaximo.toLocaleString()}\n` +
              `Deuda actual: $${validacion.saldoDeuda.toLocaleString()}\n` +
              `Crédito disponible: $${validacion.creditoDisponible.toLocaleString()}\n` +
              `Monto solicitado: $${validacion.montoSolicitado.toLocaleString()}`
            );
            resolve(false);
          } else {
            resolve(true);
          }
        },
        error: async (err) => {
          await loading.dismiss();
          console.error('Error validando crédito', err);
          await this.mostrarAlerta('Error', 'No se pudo validar el crédito del cliente');
          resolve(false);
        }
      });
    });
  }

  async pagar() {
    console.log('Intento de pago iniciado');
    
    if (this.detalles.length === 0) {
      await this.mostrarAlerta('Carrito Vacío', 'Agregue productos al carrito antes de pagar.');
      return;
    }

    // Validar que si es venta fiada, haya cliente
    if (this.tipoVenta === 'FIADO') {
      if (!this.clienteSeleccionado && !this.ventaForm.value.registrarCliente) {
        await this.mostrarAlerta(
          'Cliente Requerido',
          'Para ventas fiadas debe seleccionar un cliente o registrar uno nuevo'
        );
        return;
      }

      // Validar datos del cliente si se va a registrar
      if (this.ventaForm.value.registrarCliente) {
        const datos = this.datosClienteGroup.value;
        if (!datos.nombre || !datos.telefono) {
          await this.mostrarAlerta(
            'Datos Incompletos',
            'Debe ingresar al menos el nombre y teléfono del cliente'
          );
          return;
        }
      }

      // Validar crédito disponible si hay cliente seleccionado
      if (this.clienteSeleccionado) {
        const creditoValido = await this.validarCreditoDisponible();
        if (!creditoValido) return;
      }
    }

    // Asegurar que el grupo de cliente esté deshabilitado si no se está registrando
    // Esto previene errores de validación en campos ocultos
    if (!this.ventaForm.value.registrarCliente && this.datosClienteGroup.enabled) {
      this.datosClienteGroup.disable();
    }

    if (this.ventaForm.invalid) {
      console.log('Formulario inválido:', this.ventaForm.errors);
      Object.keys(this.ventaForm.controls).forEach(key => {
        const control = this.ventaForm.get(key);
        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      await this.mostrarAlerta('Formulario Inválido', 'Por favor revise los datos de la venta. Asegúrese de que todos los campos requeridos estén completos.');
      return;
    }

    console.log('Mostrando alerta de confirmación...');
    const confirmAlert = await this.alertController.create({
      header: 'Confirmar Venta',
      subHeader: this.tipoVenta === 'FIADO' ? 'Venta a Crédito' : 'Venta de Contado',
      message: `¿Confirma procesar la venta por valor de $${this.totalControl.value.toLocaleString()}?`,
      buttons: [
        { 
          text: 'Cancelar', 
          role: 'cancel',
          handler: () => {
            console.log('Venta cancelada por usuario');
          }
        },
        {
          text: 'Procesar Venta',
          handler: () => {
            console.log('Usuario confirmó venta');
            this.procesarVentaReal();
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  async procesarVentaReal() {
    let loading: HTMLIonLoadingElement | undefined;
    
    try {
      loading = await this.loadingController.create({
        message: 'Procesando venta...'
      });
      await loading.present();

      this.ventaForm.patchValue({ fecha: new Date().toISOString() });

      const ventaData = this.ventaForm.value;
      const payload: any = {
        usuarioId: ventaData.usuarioId,
        metodoPago: ventaData.metodoPago,
        estadoPago: ventaData.estadoPago,
        items: ventaData.detalles.map((d: any) => ({
          productoId: d.productoId,
          cantidad: d.quantity
        }))
      };

      // Agregar cliente si existe
      if (this.clienteSeleccionado) {
        payload.clienteId = this.clienteSeleccionado.id;
      }

      // Agregar datos de nuevo cliente si se va a registrar
      if (ventaData.registrarCliente) {
        payload.registrarCliente = true;
        payload.datosCliente = ventaData.datosCliente;
      }

      // Si es venta al contado, el monto pagado es el total
      if (ventaData.estadoPago === 'PAGADO') {
        payload.montoPagado = Number(ventaData.total);
      } else {
        payload.montoPagado = Number(ventaData.montoPagado || 0);
      }

      // Asegurar que usuarioId sea numérico
      if (payload.usuarioId) {
        payload.usuarioId = Number(payload.usuarioId);
      }
      
      // LOG DE DEPURACIÓN
      console.log('Payload enviado a crearVenta:', JSON.stringify(payload, null, 2));

      this.ventaService.crearVenta(payload).subscribe({
        next: async (venta) => {
          console.log('Venta creada exitosamente:', venta);
          
          if (!venta) {
            console.warn('Advertencia: El servidor retornó venta nula, usando datos locales para alerta');
            // Construir objeto venta temporal para que la UI no falle
            venta = {
              id: 0, // Dummy ID
              fecha: new Date().toISOString(),
              usuarioId: payload.usuarioId,
              detalles: [],
              total: payload.montoPagado || 0,
              metodoPago: payload.metodoPago,
              estadoPago: payload.estadoPago,
              montoPagado: payload.montoPagado || 0,
              saldoPendiente: 0,
              cliente: payload.registrarCliente ? payload.datosCliente : this.clienteSeleccionado
            } as any;
          }

          // Notificar si se creó un nuevo cliente
          if (venta.cliente && payload.registrarCliente) {
            this.clienteService.notificarNuevoCliente(venta.cliente);
          }

          this.detalles.clear();
          this.calculateTotal();
          this.clienteSeleccionado = null;
          this.mostrarRegistroCliente = false;
          this.tipoVenta = 'CONTADO';
          this.ventaForm.patchValue({
            estadoPago: 'PAGADO',
            clienteId: null,
            registrarCliente: false
          });
          this.datosClienteGroup.reset();
          this.datosClienteGroup.disable();

          let mensaje = `Venta registrada correctamente.\n`;
          mensaje += `Total: $${venta.total.toLocaleString()}\n`;
          mensaje += `Método: ${venta.metodoPago}`;

          if (venta.estadoPago === 'FIADO') {
            mensaje += `\n\n⚠️ Venta FIADA registrada`;
          }

          if (loading) await loading.dismiss();

          const successAlert = await this.alertController.create({
            header: '¡Venta Exitosa!',
            subHeader: venta.estadoPago === 'FIADO' ? 'Registrada en Cuentas por Cobrar' : 'Pago Registrado',
            message: mensaje,
            buttons: ['Aceptar'],
            cssClass: 'success-alert'
          });
          await successAlert.present();

          // Recargar clientes si se registró uno nuevo
          if (payload.registrarCliente) {
            this.loadClientes();
          }
        },
        error: async (err) => {
          console.error('Error creating sale:', err);
          if (loading) await loading.dismiss();
          
          if (err.error && err.error.message) {
            // Mensaje más amigable si viene del servidor
            const serverMsg = err.error.message;
            let friendlyMsg = serverMsg;
            
            if (serverMsg.includes('Stock insuficiente')) {
              friendlyMsg = 'No hay suficiente cantidad de productos en inventario para realizar esta venta.';
            } else if (serverMsg.includes('Cliente no encontrado')) {
              friendlyMsg = 'El cliente seleccionado no se encuentra en la base de datos.';
            }

            await this.mostrarAlerta('Atención', friendlyMsg);
          } else {
            await this.mostrarAlerta('Lo sentimos', 'Hubo un problema de conexión o con el servidor. Por favor verifique su internet e intente nuevamente.');
          }
        }
      });
    } catch (e) {
      console.error('Error inesperado en procesarVentaReal:', e);
      if (loading) await loading.dismiss();
      await this.mostrarAlerta('Error Crítico', 'Ocurrió un error inesperado al intentar procesar la venta.');
    }
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async mostrarToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger', duration: number = 2000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color,
      cssClass: 'custom-toast' // Para estilos personalizados si se requiere
    });
    await toast.present();
  }
}

