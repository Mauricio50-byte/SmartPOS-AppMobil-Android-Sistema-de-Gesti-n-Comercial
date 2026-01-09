import { Component, OnInit } from '@angular/core';
import { ProductosServices } from 'src/app/core/services/producto.service';
import { Producto } from 'src/app/core/models/producto';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ModuloService } from 'src/app/core/services/modulo.service';

@Component({
  standalone: false,
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss'],
})
export class ProductosComponent implements OnInit {
  segment: 'info' | 'gestion' = 'info';
  products: Producto[] = [];
  selectedProduct: Producto | null = null;
  modulosActivos: Set<string> = new Set();

  constructor(
    private productoService: ProductosServices,
    private moduloService: ModuloService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadModulos();
  }

  loadModulos() {
    this.moduloService.listarModulos().subscribe(modulos => {
      const nuevosModulos = new Set<string>();
      modulos.forEach(m => {
        if (m.activo) nuevosModulos.add(m.id);
      });
      this.modulosActivos = nuevosModulos;
    });
  }

  segmentChanged(event: any) {
    this.segment = event.detail.value;
    if (this.segment === 'info') {
      this.loadProducts();
      this.selectedProduct = null;
    }
  }

  loadProducts() {
    this.productoService.listarProductos().subscribe({
      next: (data) => {
        this.products = data;
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.mostrarToast('Error al cargar productos');
      }
    });
  }

  onEdit(product: Producto) {
    this.selectedProduct = product;
    this.segment = 'gestion';
  }

  async onDelete(product: Producto) {
    this.deleteConfirm(product);
  }

  async deleteConfirm(product: Producto) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar el producto <strong>${product.nombre}</strong>?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.deleteProduct(product.id);
          }
        }
      ]
    });
    await alert.present();
  }

  deleteProduct(id: number) {
    this.productoService.eliminarProductos(id).subscribe({
      next: () => {
        this.mostrarToast('Producto eliminado');
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        this.mostrarToast('Error al eliminar producto');
      }
    });
  }

  async onSave(productData: any) {
    const loading = await this.loadingController.create({ message: 'Guardando...' });
    await loading.present();

    if (this.selectedProduct) {
      this.productoService.actualizarProductos(productData, this.selectedProduct.id).subscribe({
        next: async () => {
          await loading.dismiss();
          this.mostrarToast('Producto actualizado correctamente');
          this.selectedProduct = null;
          this.segment = 'info';
          this.loadProducts();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.mostrarToast('Error al actualizar producto');
        }
      });
    } else {
      this.productoService.crearProductos(productData).subscribe({
        next: async () => {
          await loading.dismiss();
          this.mostrarToast('Producto creado correctamente');
          this.segment = 'info';
          this.loadProducts();
        },
        error: async (err) => {
          await loading.dismiss();
          console.error(err);
          this.mostrarToast('Error al crear producto');
        }
      });
    }
  }

  onCancel() {
    this.selectedProduct = null;
    this.segment = 'info';
  }

  async mostrarToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
