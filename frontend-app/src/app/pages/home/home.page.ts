import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { UsuarioPerfil } from '../../core/models';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { Observable } from 'rxjs';

import { ModalController, PopoverController } from '@ionic/angular';

export type HomeView = 'dashboard' | 'users' | 'ventas' | 'productos' | 'modulos' | 'finanzas' | 'clientes' | 'reportes' | 'configuracion';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentView: HomeView = 'dashboard';
  pageTitle: string = 'Dashboard';
  currentUser: UsuarioPerfil | null = null;
  
  notifications$: Observable<AppNotification[]>;
  unreadCount$: Observable<number>;
  isNotificationsOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private notificationService: NotificationService
  ) { 
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit() {
    this.authService.getPerfil$().subscribe(user => {
      this.currentUser = user;
      this.checkCurrentViewAccess();
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  hasPermission(permiso: string): boolean {
    if (!this.currentUser) return false;
    // Superuser has all permissions implicitly
    if (this.currentUser.roles?.includes('ADMIN')) return true;
    return this.currentUser.permisos ? this.currentUser.permisos.includes(permiso) : false;
  }

  hasModule(modulo: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.roles?.includes('ADMIN')) return true;
    return this.currentUser.modulos ? this.currentUser.modulos.includes(modulo) : false;
  }

  checkCurrentViewAccess() {
    // If user loses access to current view, switch to a safe one or dashboard
    if (this.currentView === 'users' && !this.hasPermission('VER_USUARIOS')) {
      this.currentView = 'dashboard'; // Fallback
    }
    if (this.currentView === 'ventas' && !this.hasPermission('VENDER') && !this.hasPermission('VER_VENTAS')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'productos' && !this.hasPermission('VER_INVENTARIO')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'modulos' && !this.hasPermission('GESTION_MODULOS') && !this.hasPermission('ADMIN')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'clientes' && !this.hasPermission('VER_CLIENTES')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'finanzas' && !this.hasPermission('VER_FINANZAS')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'reportes' && !this.hasPermission('VER_REPORTES')) {
      this.currentView = 'dashboard';
    }
    if (this.currentView === 'configuracion' && !this.hasPermission('VER_CONFIGURACION') && !this.hasPermission('ADMIN')) {
      this.currentView = 'dashboard';
    }
    // Update title
    this.setView(this.currentView);
  }

  setView(view: HomeView | string) {
    this.currentView = view as HomeView;
    if (view === 'dashboard') {
      this.pageTitle = 'Dashboard';
    } else if (view === 'users') {
      this.pageTitle = 'Gestión de Usuarios';
    } else if (view === 'ventas') {
      this.pageTitle = 'Ventas';
    } else if (view === 'productos') {
      this.pageTitle = 'Productos';
    } else if (view === 'clientes') {
      this.pageTitle = 'Gestión de Clientes';
    } else if (view === 'modulos') {
      this.pageTitle = 'Gestión de Módulos';
    } else if (view === 'finanzas') {
      this.pageTitle = 'Gestión Financiera';
    } else if (view === 'reportes') {
      this.pageTitle = 'Informes y Análisis';
    } else if (view === 'configuracion') {
      this.pageTitle = 'Configuración del Sistema';
    }
  }

  // Notification Methods
  markAsRead(notification: AppNotification) {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    // Handle navigation if link exists
    if (notification.link) {
      this.setView(notification.link);
      // You might need to close popover here if it doesn't close automatically
    }
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  removeNotification(event: Event, id: string) {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'urgent': return 'alert-circle';
      case 'warning': return 'warning';
      case 'success': return 'checkmark-circle';
      case 'info': default: return 'information-circle';
    }
  }

  getColorForType(type: string): string {
    switch (type) {
      case 'urgent': return 'danger';
      case 'warning': return 'warning';
      case 'success': return 'success';
      case 'info': default: return 'primary';
    }
  }
}
