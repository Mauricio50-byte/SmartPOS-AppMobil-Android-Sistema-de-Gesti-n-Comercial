import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductosServices } from './producto.service';
import { DeudaService } from './deuda.service';
import { CajaService } from './caja.service';
import { Producto, Deuda, Caja } from '../models';

export type NotificationType = 'urgent' | 'info' | 'success' | 'warning';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date;
  link?: string;
  source?: 'system' | 'user'; // To distinguish auto-generated vs manual
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<AppNotification[]>([]);

  constructor(
    private productosService: ProductosServices,
    private deudaService: DeudaService,
    private cajaService: CajaService
  ) {
    this.checkSystemState();
    
    // Optional: Poll every 5 minutes
    setInterval(() => {
      this.checkSystemState();
    }, 5 * 60 * 1000);
  }

  get notifications$(): Observable<AppNotification[]> {
    return this.notifications.asObservable();
  }

  get unreadCount$(): Observable<number> {
    return this.notifications.pipe(
      map(list => list.filter(n => !n.read).length)
    );
  }

  checkSystemState() {
    forkJoin({
      productos: this.productosService.listarProductos().pipe(catchError(() => of([]))),
      deudas: this.deudaService.listarDeudas({ estado: 'PENDIENTE' }).pipe(catchError(() => of([]))),
      caja: this.cajaService.obtenerEstadoCaja().pipe(catchError(() => of(null)))
    }).subscribe(({ productos, deudas, caja }) => {
      const systemNotifications: AppNotification[] = [];

      // 1. Check Low Stock
      const lowStockProducts = productos.filter(p => p.stock <= (p.stockMinimo || 5));
      if (lowStockProducts.length > 0) {
        if (lowStockProducts.length === 1) {
          systemNotifications.push(this.createSystemNotification(
            `Stock Bajo: ${lowStockProducts[0].nombre}`,
            `Quedan solo ${lowStockProducts[0].stock} unidades. Mínimo: ${lowStockProducts[0].stockMinimo || 5}.`,
            'urgent',
            'productos'
          ));
        } else {
          systemNotifications.push(this.createSystemNotification(
            'Alerta de Inventario',
            `Hay ${lowStockProducts.length} productos con stock bajo o crítico.`,
            'urgent',
            'productos'
          ));
        }
      }

      // 2. Check Overdue Debts
      const now = new Date();
      const overdueDebts = deudas.filter(d => d.fechaVencimiento && new Date(d.fechaVencimiento) < now);
      if (overdueDebts.length > 0) {
        systemNotifications.push(this.createSystemNotification(
          'Deudas Vencidas',
          `Tienes ${overdueDebts.length} cuentas por cobrar vencidas.`,
          'warning',
          'finanzas' // Assuming 'finanzas' or 'clientes' is the view
        ));
      }

      // 3. Check Caja Status
      if (caja) {
        if (caja.fechaCierre) {
           // Closed
           // Maybe info?
        } else {
           // Open
           const openTime = new Date(caja.fechaApertura).getTime();
           const hoursOpen = (now.getTime() - openTime) / (1000 * 60 * 60);
           if (hoursOpen > 12) {
             systemNotifications.push(this.createSystemNotification(
               'Caja Abierta por mucho tiempo',
               `La caja ha estado abierta por ${Math.floor(hoursOpen)} horas. Recuerda cerrarla.`,
               'info',
               'finanzas' // Or wherever caja is managed
             ));
           }
        }
      } else {
        // No active caja info usually means closed or no record, maybe prompt to open?
        systemNotifications.push(this.createSystemNotification(
           'Caja Cerrada',
           'No hay una caja abierta actualmente. Abre caja para comenzar a vender.',
           'info',
           'dashboard' // Or wherever
        ));
      }

      // Merge with existing manual notifications (preserving read state of existing ones if ID matches?)
      // For simplicity, we just prepend new system notifications. 
      // To avoid duplicates, we could check IDs or clear old system notifications.
      
      const current = this.notifications.value.filter(n => n.source !== 'system');
      this.notifications.next([...systemNotifications, ...current]);
    });
  }

  private createSystemNotification(title: string, message: string, type: NotificationType, link?: string): AppNotification {
    return {
      id: `sys-${title.replace(/\s/g, '-')}`, // Simple ID generation
      title,
      message,
      type,
      read: false,
      timestamp: new Date(),
      link,
      source: 'system'
    };
  }

  // Manual notification methods (for user actions)
  addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'source'>) {
    const current = this.notifications.value;
    const newNotification: AppNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      source: 'user'
    };
    this.notifications.next([newNotification, ...current]);
  }

  markAsRead(id: string) {
    const current = this.notifications.value;
    const updated = current.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications.next(updated);
  }

  markAllAsRead() {
    const current = this.notifications.value;
    const updated = current.map(n => ({ ...n, read: true }));
    this.notifications.next(updated);
  }

  deleteNotification(id: string) {
    const current = this.notifications.value;
    const updated = current.filter(n => n.id !== id);
    this.notifications.next(updated);
  }

  clearAll() {
    this.notifications.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
