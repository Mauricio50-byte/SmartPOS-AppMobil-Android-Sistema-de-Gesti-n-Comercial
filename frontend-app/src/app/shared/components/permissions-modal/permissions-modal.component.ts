import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { RolService } from '../../../core/services/rol.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { Modulo, ModuloService } from '../../../core/services/modulo.service';
import { AuthService } from '../../../core/services/auth.service';
import { Rol, Usuario, Permiso } from '../../../core/models';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-permissions-modal',
  templateUrl: './permissions-modal.component.html',
  styleUrls: ['./permissions-modal.component.scss'],
  standalone: false
})
export class PermissionsModalComponent implements OnInit {
  @Input() usuario!: Usuario;

  roles: Rol[] = [];
  selectedRoles: string[] = [];
  rolesLoadError = false;
  modulesLoadError = false;
  
  availablePermissions: string[] = [];
  visiblePermissions: string[] = [];
  allPermissionsData: Permiso[] = [];
  
  // Permisos asignados directamente (no por rol)
  directPermissions: string[] = [];

  availableModules: Modulo[] = [];
  modulosSistema: Modulo[] = [];
  modulosNegocio: Modulo[] = [];
  selectedModules: string[] = [];

  actorEsAdmin = false;
  
  loading = false;
  activeTab: 'roles' | 'permisos' | 'modulos' = 'roles';

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private rolService: RolService,
    private usuarioService: UsuarioService,
    private moduloService: ModuloService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.getPerfil$().subscribe(p => {
      console.log('Perfil del actor actual:', p);
      this.actorEsAdmin = Array.isArray(p?.roles) ? p!.roles.includes('ADMIN') : false;
      this.updateVisiblePermissions();
      // Si no es admin, no debería estar aquí, pero por si acaso
      if (!this.actorEsAdmin) {
        this.dismiss();
      }
    });
    this.loadRoles();
    this.loadPermissions();
    if (this.usuario) {
      this.loadUserPermissions();
    }
  }

  loadPermissions() {
    this.rolService.listarPermisos().subscribe({
      next: (permisos) => {
        this.allPermissionsData = permisos;
        this.availablePermissions = permisos.map(p => p.clave);
        this.updateVisiblePermissions();
      },
      error: (error) => {
        console.error('Error loading permissions', error);
        this.availablePermissions = [
          'GESTION_USUARIOS',
          'CREAR_ADMIN',
          'CREAR_ROL',
          'EDITAR_ROL',
          'ASIGNAR_PERMISOS',
          'VENDER',
          'GESTION_INVENTARIO',
          'GESTION_CLIENTES',
          'VER_REPORTES',
          'GESTION_FINANZAS',
          'GESTION_MODULOS',
          'ADMIN'
        ];
        this.updateVisiblePermissions();
      }
    });
  }

  loadUserPermissions() {
    this.loading = true;
    this.usuarioService.getUsuario(this.usuario.id).subscribe({
      next: (fullUsuario) => {
        this.usuario = fullUsuario;
        this.selectedRoles = fullUsuario.roles ? [...fullUsuario.roles] : [];
        this.directPermissions = fullUsuario.permisosDirectos ? [...fullUsuario.permisosDirectos] : [];
        this.selectedModules = (fullUsuario as any).modulos ? [...(fullUsuario as any).modulos] : [];
        this.loadAvailableModules(fullUsuario.negocioId ?? null);
        this.loading = false;
        // Logic check for editing admins removed as per request to allow full admin control
      },
      error: (error) => {
        console.error('Error loading user details', error);
        void this.presentError('No se pudieron cargar los datos del usuario.');
        // Fallback to input data if fetch fails, though likely incomplete
        this.selectedRoles = this.usuario.roles ? [...this.usuario.roles] : [];
        this.directPermissions = this.usuario.permisosDirectos ? [...this.usuario.permisosDirectos] : [];
        this.selectedModules = (this.usuario as any).modulos ? [...(this.usuario as any).modulos] : [];
        this.loadAvailableModules(this.usuario.negocioId ?? null);
        this.loading = false;
      }
    });
  }

  loadRoles() {
    this.loading = true;
    this.rolesLoadError = false;
    this.rolService.listarRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading roles', error);
        this.rolesLoadError = true;
        void this.presentError('No se pudieron cargar los roles.');
        this.loading = false;
      }
    });
  }

  toggleRole(roleName: string) {
    // Radio button behavior: Only one role can be selected at a time
    if (this.selectedRoles.includes(roleName)) return;

    this.selectedRoles = [roleName];

    // Apply Role Permissions Template (Role is Initial State)
    const role = this.roles.find(r => r.nombre === roleName);
    if (role && role.permisos) {
      const rolePerms = role.permisos.map((p: any) => p.permiso.clave);
      // We replace permissions with the new role's defaults to ensure the state matches the role
      this.directPermissions = [...rolePerms];
      
      // Update Modules based on Role
      if (roleName === 'ADMIN') {
          // Admin gets all system modules
          const sysMods = this.modulosSistema.map(m => m.id);
          // Keep existing business modules
          const currentBizMods = this.selectedModules.filter(m => !this.modulosSistema.find(sm => sm.id === m));
          this.selectedModules = [...new Set([...sysMods, ...currentBizMods])];
      } else if (['TRABAJADOR', 'CAJERO'].includes(roleName)) {
          // Worker defaults (Ensure Dashboard)
          if (!this.selectedModules.includes('dashboard')) {
             this.selectedModules.push('dashboard');
          }
      }
    }
  }

  isRoleSelected(roleName: string): boolean {
    return this.selectedRoles.includes(roleName);
  }

  toggleDirectPermission(permiso: string) {
    const index = this.directPermissions.indexOf(permiso);
    if (index > -1) {
      this.directPermissions.splice(index, 1);
    } else {
      this.directPermissions.push(permiso);
    }
  }

  isPermissionDirect(permiso: string): boolean {
    return this.directPermissions.includes(permiso);
  }

  isPermissionInherited(permiso: string): boolean {
    // Permissions are now fully decoupled from roles.
    // Roles act as templates, but once applied, permissions are "Direct".
    // Therefore, we never show permissions as "Inherited" (locked).
    return false;
  }

  loadAvailableModules(negocioId: number | null) {
    this.modulesLoadError = false;
    if (!negocioId) {
      this.availableModules = [];
      return;
    }
    this.moduloService.listarModulos(negocioId).subscribe({
      next: (modulos) => {
        this.availableModules = modulos || [];
        
        // Separar módulos por tipo
        this.modulosSistema = this.availableModules.filter(m => m.tipo === 'SISTEMA');
        this.modulosNegocio = this.availableModules.filter(m => m.tipo === 'NEGOCIO' || !m.tipo);

        const activosSet = new Set(this.availableModules.filter(m => m.activo).map(m => m.id));
        this.selectedModules = (this.selectedModules || []).filter(m => activosSet.has(m));
        
        // Agregar módulos del sistema a selectedModules si no están
        // MODIFICADO: Solo asegurar 'dashboard' por defecto, no todos los módulos del sistema.
        if (!this.selectedModules.includes('dashboard')) {
           this.selectedModules.push('dashboard');
        }
      },
      error: () => {
        this.availableModules = [];
        this.modulosSistema = [];
        this.modulosNegocio = [];
        this.modulesLoadError = true;
        void this.presentError('No se pudieron cargar los módulos.');
      }
    });
  }

  toggleModule(moduloId: string) {
    // Permitir editar todos los módulos, incluso los del sistema
    // const modulo = this.availableModules.find(m => m.id === moduloId);
    // if (modulo?.tipo === 'SISTEMA') {
    //   return;
    // }

    const index = this.selectedModules.indexOf(moduloId);
    if (index > -1) {
      this.selectedModules.splice(index, 1);
    } else {
      this.selectedModules.push(moduloId);
    }
  }

  isModuleSelected(moduloId: string): boolean {
    return this.selectedModules.includes(moduloId);
  }

  get groupedPermissions(): { module: string, permissions: string[] }[] {
    const groups: { [key: string]: string[] } = {};
    const miscKey = 'Otros / General';

    this.visiblePermissions.forEach(permKey => {
      const permData = this.allPermissionsData.find(p => p.clave === permKey);
      let modName = miscKey;
      if (permData?.moduloId) {
        const mod = this.availableModules.find(m => m.id === permData.moduloId);
        modName = mod ? mod.nombre : (permData.moduloId.charAt(0).toUpperCase() + permData.moduloId.slice(1));
      }
      
      if (!groups[modName]) {
        groups[modName] = [];
      }
      groups[modName].push(permKey);
    });

    // Sort: put 'Otros' at the end, others alphabetically
    return Object.keys(groups).sort((a, b) => {
      if (a === miscKey) return 1;
      if (b === miscKey) return -1;
      return a.localeCompare(b);
    }).map(key => ({
      module: key,
      permissions: groups[key]
    }));
  }

  private updateVisiblePermissions() {
    if (this.actorEsAdmin) {
      this.visiblePermissions = [...this.availablePermissions];
      return;
    }
    this.visiblePermissions = ['VENDER', 'GESTION_INVENTARIO', 'GESTION_CLIENTES', 'VER_REPORTES', 'GESTION_FINANZAS'];
  }

  getPermissionDescription(permiso: string): string {
    const p = this.allPermissionsData.find(x => x.clave === permiso);
    return p?.descripcion || 'Sin descripción';
  }

  dismiss() {
    this.modalController.dismiss();
  }

  async save() {
    if (!this.usuario) return;
    const targetRoles = Array.isArray(this.usuario?.roles) ? this.usuario.roles : [];
    // Permitir guardar si es Admin
    if (!this.actorEsAdmin) { this.dismiss(); return; }

    // Confirm critical changes if permissions are being removed or admin role removed
    const isRemovingAdmin = this.usuario.roles?.includes('ADMIN') && !this.selectedRoles.includes('ADMIN');
    
    if (isRemovingAdmin) {
      const alert = await this.alertController.create({
        header: 'Confirmación Crítica',
        message: 'Estás a punto de quitar el rol de ADMINISTRADOR a este usuario. ¿Estás seguro? Esta acción restringirá severamente su acceso.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { 
            text: 'Sí, quitar rol', 
            handler: () => this.executeSave() 
          }
        ]
      });
      await alert.present();
    } else {
      this.executeSave();
    }
  }

  executeSave() {
    this.loading = true;
    
    // Save roles
    this.usuarioService.asignarRoles(this.usuario.id, this.selectedRoles).subscribe({
      next: () => {
        // Save direct permissions
        this.usuarioService.asignarPermisosDirectos(this.usuario.id, this.directPermissions).subscribe({
          next: () => {
            const negocioId = this.usuario?.negocioId ?? null;
            const selectedSet = new Set(this.selectedModules || []);
            const toEnable = typeof negocioId === 'number'
              ? this.availableModules.filter(m => selectedSet.has(m.id) && m.activo === false).map(m => m.id)
              : [];

            const enable$ = toEnable.length && typeof negocioId === 'number'
              ? forkJoin(toEnable.map(id => this.moduloService.toggleModulo(id, true, negocioId)))
              : of([]);

            enable$.subscribe({
              next: () => {
                this.usuarioService.asignarModulos(this.usuario.id, this.selectedModules).subscribe({
                  next: () => {
                    this.loading = false;
                    this.modalController.dismiss({
                      updated: true,
                      roles: this.selectedRoles,
                      permisos: this.directPermissions,
                      modulos: this.selectedModules
                    });
                  },
                  error: (err) => {
                    console.error('Error saving modules', err);
                    void this.presentError('No se pudieron guardar los módulos.');
                    this.loading = false;
                  }
                })
              },
              error: (err) => {
                console.error('Error enabling modules', err);
                void this.presentError('No se pudieron activar los módulos del negocio.');
                this.loading = false;
              }
            })
          },
          error: (err) => {
             console.error('Error saving permissions', err);
             void this.presentError('No se pudieron guardar los permisos.');
             this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error assigning roles', error);
        void this.presentError('No se pudieron guardar los roles.');
        this.loading = false;
      }
    });
  }

  private async presentError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}