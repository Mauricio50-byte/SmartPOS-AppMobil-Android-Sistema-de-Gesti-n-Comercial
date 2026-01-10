import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Producto } from 'src/app/core/models/producto';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, eyeOutline, filterOutline } from 'ionicons/icons';

interface Column {
  key: string;
  label: string;
  path?: string; // Para acceder a propiedades anidadas como 'detalleRopa.talla'
  type?: 'text' | 'currency' | 'boolean' | 'badge' | 'date';
  badgeColor?: (value: any) => string;
}

@Component({
  standalone: true,
  selector: 'app-productos-lista',
  templateUrl: './productos-lista.component.html',
  styleUrls: ['./productos-lista.component.scss'],
  imports: [CommonModule, IonicModule, FormsModule]
})
export class ProductosListaComponent implements OnChanges, OnInit {
  @Input() products: Producto[] = [];
  @Input() modulosActivos: Set<string> = new Set();
  @Output() edit = new EventEmitter<Producto>();
  @Output() delete = new EventEmitter<Producto>();

  filteredProducts: Producto[] = [];
  searchTerm: string = '';
  selectedModule: string = 'TODOS';
  
  displayedColumns: Column[] = [];
  
  availableModules: any[] = [];

  // Configuración de Columnas Base (Comunes)
  private baseColumns: Column[] = [
    { key: 'nombre', label: 'Producto', type: 'text' },
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'precioVenta', label: 'Precio', type: 'currency' },
    { key: 'stock', label: 'Stock', type: 'text' },
    { key: 'unidadMedida', label: 'Unidad', type: 'text' },
    { key: 'proveedor', label: 'Proveedor', type: 'text' },
    { 
      key: 'activo', 
      label: 'Estado', 
      type: 'badge', 
      badgeColor: (val) => val ? 'success' : 'medium' 
    }
  ];

  // Configuración específica por módulo
  private moduleColumns: { [key: string]: Column[] } = {
    'ROPA': [
      { key: 'talla', label: 'Talla', path: 'detalleRopa.talla', type: 'text' },
      { key: 'color', label: 'Color', path: 'detalleRopa.color', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' }
    ],
    'ALIMENTO': [
      { key: 'fechaVencimiento', label: 'Vence', path: 'detalleAlimento.fechaVencimiento', type: 'date' },
      { key: 'lote', label: 'Lote', path: 'detalleAlimento.lote', type: 'text' }
    ],
    'SERVICIO': [
      { key: 'duracion', label: 'Duración (min)', path: 'detalleServicio.duracion', type: 'text' },
      { key: 'responsable', label: 'Responsable', path: 'detalleServicio.responsable', type: 'text' }
    ],
    'FARMACIA': [
      { key: 'componenteActivo', label: 'Componente', path: 'detalleFarmacia.componenteActivo', type: 'text' },
      { key: 'presentacion', label: 'Presentación', path: 'detalleFarmacia.presentacion', type: 'text' },
      { key: 'laboratorio', label: 'Laboratorio', path: 'detalleFarmacia.laboratorio', type: 'text' }
    ],
    'PAPELERIA': [
      { key: 'tipoPapel', label: 'Tipo Papel', path: 'detallePapeleria.tipoPapel', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' }
    ],
    'RESTAURANTE': [
      { key: 'tiempoPreparacion', label: 'T. Prep (min)', path: 'detalleRestaurante.tiempoPreparacion', type: 'text' },
      { key: 'esVegano', label: 'Vegano', path: 'detalleRestaurante.esVegano', type: 'boolean' }
    ]
  };

  modules = [
    { id: 'TODOS', label: 'Todos los Productos' },
    { id: 'GENERAL', label: 'General' },
    { id: 'ROPA', label: 'Ropa y Accesorios' },
    { id: 'ALIMENTO', label: 'Alimentos' },
    { id: 'SERVICIO', label: 'Servicios' },
    { id: 'FARMACIA', label: 'Farmacia' },
    { id: 'PAPELERIA', label: 'Papelería' },
    { id: 'RESTAURANTE', label: 'Restaurante' }
  ];

  constructor() {
    addIcons({ createOutline, trashOutline, eyeOutline, filterOutline });
  }

  ngOnInit() {
    this.updateAvailableModules();
    this.updateColumns();
    this.filterProducts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['products']) {
      this.filterProducts();
    }
    if (changes['modulosActivos']) {
      this.updateAvailableModules();
    }
  }

  updateAvailableModules() {
    this.availableModules = this.modules.filter(m => {
      if (m.id === 'TODOS' || m.id === 'GENERAL') return true;
      // Convertir el ID del módulo a minúsculas para coincidir con modulosActivos (ej: ROPA -> ropa)
      return this.modulosActivos.has(m.id.toLowerCase()) || this.modulosActivos.has(m.id);
    });
    
    // Si el módulo seleccionado ya no está disponible, volver a TODOS
    const isSelectedAvailable = this.availableModules.some(m => m.id === this.selectedModule);
    if (!isSelectedAvailable) {
      this.selectedModule = 'TODOS';
      this.updateColumns();
      this.filterProducts();
    }
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value;
    this.filterProducts();
  }

  onModuleChange(event: any) {
    this.selectedModule = event.detail.value;
    this.updateColumns();
    this.filterProducts();
  }

  updateColumns() {
    // Comenzar con las columnas base
    let cols = [...this.baseColumns];
    
    // Insertar columnas específicas del módulo si no es TODOS ni GENERAL
    if (this.selectedModule !== 'TODOS' && this.selectedModule !== 'GENERAL') {
      const specificCols = this.moduleColumns[this.selectedModule] || [];
      // Insertar después de 'Categoría' (índice 2)
      cols.splice(3, 0, ...specificCols);
    }

    this.displayedColumns = cols;
  }

  filterProducts() {
    let temp = this.products;

    // 1. Filtro por Módulo
    if (this.selectedModule !== 'TODOS') {
      temp = temp.filter(p => p.tipo === this.selectedModule);
    }

    // 2. Filtro por Buscador
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(p =>
        p.nombre.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.proveedor && p.proveedor.toLowerCase().includes(term))
      );
    }

    this.filteredProducts = temp;
  }

  // Helper para obtener valores anidados de forma segura
  getValue(product: any, col: Column): any {
    if (col.path) {
      const parts = col.path.split('.');
      let value = product;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined || value === null) return null;
      }
      return value;
    }
    return product[col.key];
  }

  onEdit(product: Producto) {
    this.edit.emit(product);
  }

  onDelete(product: Producto) {
    this.delete.emit(product);
  }

  isLowStock(product: any): boolean {
    if (!product || product.stock === undefined) return false;
    const minStock = product.stockMinimo || 5; // Default to 5 if not set
    return product.stock <= minStock;
  }
}
