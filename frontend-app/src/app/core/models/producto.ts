export type TipoProducto = 'GENERAL' | 'ROPA' | 'ALIMENTO' | 'SERVICIO' | 'FARMACIA' | 'PAPELERIA' | 'RESTAURANTE';

export interface ProductoRopa {
  talla?: string;
  color?: string;
  material?: string;
  genero?: string;
  temporada?: string;
}

export interface ProductoAlimento {
  fechaVencimiento?: string | Date;
  lote?: string;
  registroSanitario?: string;
  ingredientes?: string;
  esPerecedero?: boolean;
  temperaturaConservacion?: string;
}

export interface ProductoServicio {
  duracion?: number;
  responsable?: string;
  requiereCita?: boolean;
  garantiaDias?: number;
}

export interface ProductoFarmacia {
  componenteActivo?: string;
  presentacion?: string;
  dosis?: string;
  laboratorio?: string;
  requiereReceta?: boolean;
  fechaVencimiento?: string | Date;
  lote?: string;
  registroInvima?: string;
}

export interface ProductoPapeleria {
  tipoPapel?: string;
  gramaje?: string;
  dimensiones?: string;
  material?: string;
  esKit?: boolean;
}

export interface ProductoRestaurante {
  ingredientes?: string;
  tiempoPreparacion?: number;
  esVegano?: boolean;
  esVegetariano?: boolean;
  tieneAlcohol?: boolean;
  calorias?: number;
}

export interface Producto {
  id: number;
  tipo: TipoProducto | string;
  
  // Identificación
  nombre: string;
  sku?: string;
  
  // Descripción
  descripcion?: string;
  imagen?: string;
  
  // Categorización
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  
  // Precios
  precioCosto?: number;
  precioVenta: number;
  descuento?: number;
  
  // Inventario
  stock: number;
  stockMinimo?: number;
  unidadMedida?: string;
  
  // Impuestos y Proveedor
  iva?: number;
  proveedor?: string;
  
  // Estado
  activo: boolean;
  
  // Detalles Modulares
  detalleRopa?: ProductoRopa;
  detalleAlimento?: ProductoAlimento;
  detalleServicio?: ProductoServicio;
  detalleFarmacia?: ProductoFarmacia;
  detallePapeleria?: ProductoPapeleria;
  detalleRestaurante?: ProductoRestaurante;
  
  // Timestamps
  creadoEn?: string | Date;
  actualizadoEn?: string | Date;
}

export type ProductoCrear = Omit<Producto, 'id' | 'creadoEn' | 'actualizadoEn'> & ProductoRopa & ProductoAlimento & ProductoServicio & ProductoFarmacia & ProductoPapeleria & ProductoRestaurante;
export type ProductoActualizar = Partial<ProductoCrear>;
