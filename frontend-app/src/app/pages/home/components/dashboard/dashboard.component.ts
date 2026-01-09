import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { VentaServices } from '../../../../core/services/venta.service';
import { ProductosServices } from '../../../../core/services/producto.service';
import { ClientesServices } from '../../../../core/services/cliente.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  @Output() navigate = new EventEmitter<string>();

  private ventaServices = inject(VentaServices);
  private productosServices = inject(ProductosServices);
  private clientesServices = inject(ClientesServices);
  private authService = inject(AuthService);

  currentUser: any = null;

  // KPIs
  totalIngresos = 0;
  totalVentas = 0;
  nuevosClientes = 0;
  ticketPromedio = 0;

  // Lists
  recentTransactions: any[] = [];
  lowStockProducts: any[] = [];
  topProducts: any[] = [];
  
  // Full Data
  allVentas: any[] = [];
  allProductos: any[] = [];
  allClientes: any[] = [];

  // Charts Data
  public ventasChartData: ChartData<'bar'> | undefined;

  public barChartType: ChartType = 'bar';

  dataLoaded = false;
  timeFilter: 'week' | 'month' | 'year' = 'month';

  // Configuración de Gráficos
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { color: '#6b7280', font: { size: 12 } },
        beginAtZero: true
      }
    }
  };

  ngOnInit() {
    this.authService.getPerfil$().subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadDashboardData();
      }
    });
  }

  canAccess(permiso: string): boolean {
    if (!this.currentUser) return false;
    // Admin global tiene acceso a todo
    if (this.currentUser.adminPorDefecto === true) return true;
    
    if (permiso === 'ADMIN') return this.currentUser.adminPorDefecto === true;
    return this.currentUser.permisos ? this.currentUser.permisos.includes(permiso) : false;
  }

  loadDashboardData() {
    this.dataLoaded = false;
    
    const obs: any = {};

    if (this.canAccess('VER_VENTAS') || this.canAccess('VENDER')) {
      obs.ventas = this.ventaServices.listarVentas();
    } else {
      obs.ventas = of([]);
    }

    if (this.canAccess('VER_INVENTARIO')) {
      obs.productos = this.productosServices.listarProductos();
    } else {
      obs.productos = of([]);
    }

    if (this.canAccess('VER_CLIENTES')) {
      obs.clientes = this.clientesServices.listarClientes();
    } else {
      obs.clientes = of([]);
    }

    forkJoin(obs).subscribe({
      next: (results: any) => {
        const ventas = results.ventas || [];
        const productos = results.productos || [];
        const clientes = results.clientes || [];

        this.allVentas = ventas;
        this.allProductos = productos;
        this.allClientes = clientes;

        this.processMetrics(ventas, clientes);
        this.processSalesChart(ventas);
        this.processTopProducts(ventas, productos);
        this.processRecentTransactions(ventas);
        this.processLowStock(productos);
        this.dataLoaded = true;
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
        this.dataLoaded = true;
      }
    });
  }

  private processMetrics(ventas: any[], clientes: any[]) {
    // Total Ingresos (Sum of total paid)
    this.totalIngresos = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    
    // Total Ventas
    this.totalVentas = ventas.length;

    // Ticket Promedio
    this.ticketPromedio = this.totalVentas > 0 ? this.totalIngresos / this.totalVentas : 0;

    // Nuevos Clientes (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.nuevosClientes = clientes.filter(c => {
      const createdAt = c.createdAt ? new Date(c.createdAt) : new Date(); // Fallback if no date
      return createdAt >= thirtyDaysAgo;
    }).length;
  }

  private processRecentTransactions(ventas: any[]) {
    // Sort by date descending and take top 5
    this.recentTransactions = [...ventas]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);
  }

  private processLowStock(productos: any[]) {
    // Filter products with stock <= stockMinimo or default 5
    this.lowStockProducts = productos
      .filter(p => p.stock <= (p.stockMinimo || 5))
      .sort((a, b) => a.stock - b.stock) // Ascending (lowest first)
      .slice(0, 5); // Show up to 5 critical items
  }

  private processSalesChart(ventas: any[]) {
    // Group by month (last 12 months) or day depending on filter
    // For simplicity, let's do monthly sales for the current year
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const salesByMonth = new Array(12).fill(0);

    ventas.forEach(v => {
      const date = new Date(v.fecha);
      const month = date.getMonth();
      const year = date.getFullYear();
      if (year === new Date().getFullYear()) {
        salesByMonth[month] += Number(v.total) || 0;
      }
    });

    this.ventasChartData = {
      labels: months,
      datasets: [
        {
          data: salesByMonth,
          label: 'Ventas',
          backgroundColor: '#3880ff',
          borderRadius: 4,
          hoverBackgroundColor: '#3dc2ff'
        }
      ]
    };
  }

  private processTopProducts(ventas: any[], productos: any[]) {
    const productSales: Record<number, number> = {};

    ventas.forEach(v => {
      if (v.items && Array.isArray(v.items)) {
        v.items.forEach((item: any) => {
          const pId = item.producto?.id || item.productoId; 
          const qty = item.cantidad || 1;
          if (pId) {
            productSales[pId] = (productSales[pId] || 0) + qty;
          }
        });
      } else if (v.detalles && Array.isArray(v.detalles)) {
         v.detalles.forEach((d: any) => {
            const pId = d.producto?.id || d.productoId;
            const qty = d.cantidad || 1;
            if (pId) productSales[pId] = (productSales[pId] || 0) + qty;
         });
      }
    });

    // Sort and take top 5
    const sortedProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const maxQty = sortedProducts.length > 0 ? sortedProducts[0][1] : 0;

    this.topProducts = sortedProducts.map(([id, qty]) => {
      const p = productos.find(prod => prod.id === Number(id));
      return {
        id: Number(id),
        name: p ? p.nombre : `Producto #${id}`,
        qty: qty,
        percentage: maxQty > 0 ? (qty / maxQty) * 100 : 0
      };
    });
  }

  onFilterChange(event: any) {
    this.timeFilter = event.detail.value;
    // Implement filter logic here (reload data with params)
    this.loadDashboardData();
  }

  onNavigate(view: string) {
    this.navigate.emit(view);
  }
}
