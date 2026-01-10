import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ModalController } from '@ionic/angular';
import { Usuario } from '../../../../core/models';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { PermissionsModalComponent } from '../../../../shared/components/permissions-modal/permissions-modal.component';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: false
})
export class UsersComponent implements OnInit {
  formgroup: FormGroup;
  usuarios: Usuario[] = [];
  usuarioSeleccionado: Usuario | null = null;
  mostrarFormulario = false;
  isEditMode = false;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    this.formgroup = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      correo: ['', [Validators.required, Validators.email]],
      rol: ['TRABAJADOR', Validators.required],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      activo: [true, Validators.required]
    });
  }

  ngOnInit() {
    this.getUsuarios();
  }

  // Control del modal
  mostrarFormularioCrear() {
    this.mostrarFormulario = true;
    this.isEditMode = false;
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.formgroup.reset({
      rol: 'TRABAJADOR',
      activo: true
    });
    // Restore password validation for create mode
    this.formgroup.get('passwordHash')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.formgroup.get('passwordHash')?.updateValueAndValidity();
  }

  getUsuarios() {
    this.isLoading = true;
    this.usuarioService.getUsuarios().subscribe({
      next: (usuarios: Usuario[]) => {
        this.usuarios = usuarios;
        console.log('Usuarios cargados:', this.usuarios);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.warn('No se pudieron cargar usuarios desde el backend:', error);
        this.mostrarAlerta('Error de Carga', 'No se pudieron cargar los usuarios. Verifique que el servidor esté activo y usted tenga permisos.' + (error.message || ''));
        this.usuarios = [];
        this.isLoading = false;
      }
    });
  }

  guardarUsuario() {
    if (this.formgroup.valid) {
      if (this.isEditMode && this.usuarioSeleccionado) {
        // We are editing
        this.updateUsuario(this.usuarioSeleccionado.id, this.formgroup.value);
      } else {
        // We are creating
        const formData = this.formgroup.value;
        const nuevoUsuario = {
          ...formData,
          password: formData.passwordHash // Send raw password as 'password'
        };
        delete nuevoUsuario.passwordHash; // Remove the field name used in form

        this.usuarioService.createUsuario(nuevoUsuario).subscribe({
          next: async (usuario: Usuario) => {
            console.log('Usuario creado', usuario);
            this.getUsuarios();
            this.cerrarFormulario();
            
            const alert = await this.alertController.create({
              header: 'Usuario Creado',
              message: 'El usuario ha sido registrado exitosamente. ¿Desea configurar sus permisos y módulos ahora?',
              buttons: [
                {
                  text: 'Más tarde',
                  role: 'cancel'
                },
                {
                  text: 'Configurar Ahora',
                  handler: () => {
                    this.gestionarPermisos(usuario);
                  }
                }
              ]
            });
            await alert.present();
          },
          error: (error: any) => {
            console.error('Error creando usuario', error);
            this.mostrarAlerta('Error', 'No se pudo crear el usuario. ' + (error.error?.message || error.message || ''));
          }
        });
      }
    }
  }

  toggleMenu(usuario: Usuario) {
    this.usuarioSeleccionado = this.usuarioSeleccionado?.id === usuario.id ? null : usuario;
  }

  verDetalles(usuario: Usuario) {
    console.log('Ver detalles:', usuario);
    // Aquí podrías navegar a una página de detalles o mostrar un modal
  }

  editarUsuario(usuario: Usuario) {
    console.log('Editar usuario:', usuario);
    this.mostrarFormulario = true;
    this.isEditMode = true;
    this.usuarioSeleccionado = usuario;

    this.formgroup.patchValue({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.roles && usuario.roles.length > 0 ? usuario.roles[0] : 'TRABAJADOR',
      activo: usuario.activo
    });
    // Password is not updated here, so validation is not required for edit mode.
    this.formgroup.get('passwordHash')?.clearValidators();
    this.formgroup.get('passwordHash')?.updateValueAndValidity();
  }

  async cambiarContrasena(id: number, nueva: string) {
    const alert = await this.alertController.create({
      header: 'Cambiar Contraseña',
      inputs: [
        {
          name: 'nuevaPassword',
          type: 'password',
          placeholder: 'Nueva contraseña',
          attributes: {
            minlength: 6
          }
        },
        {
          name: 'confirmarPassword',
          type: 'password',
          placeholder: 'Confirmar contraseña',
          attributes: {
            minlength: 6
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: (data: any) => {
            if (data.nuevaPassword && data.nuevaPassword === data.confirmarPassword) {
              this.usuarioService.cambiarPassword(id, data.nuevaPassword).subscribe(() => {
                console.log('Contraseña cambiada exitosamente');
                this.mostrarAlerta('Éxito', 'Contraseña cambiada correctamente');
              });
            } else {
              this.mostrarAlerta('Error', 'Las contraseñas no coinciden');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async gestionarPermisos(usuario: Usuario) {
    const modal = await this.modalController.create({
      component: PermissionsModalComponent,
      cssClass: 'permissions-modal-large',
      componentProps: {
        usuario: usuario
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.updated) {
      this.mostrarAlerta('Éxito', 'Permisos actualizados correctamente');
      this.getUsuarios(); // Reload users to show updated roles
    }
  }

  async eliminarUsuario(usuario: Usuario) {
    if (usuario.correo === 'admin@sistema-pos.local') {
      this.mostrarAlerta('Acción no permitida', 'El usuario administrador principal no puede ser eliminado.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro que desea eliminar al usuario <strong>${usuario.nombre}</strong>? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.usuarioService.deleteUsuario(usuario.id).subscribe({
              next: () => {
                this.mostrarAlerta('Éxito', 'Usuario eliminado correctamente');
                this.getUsuarios();
              },
              error: (err) => {
                console.error('Error eliminando usuario', err);
                this.mostrarAlerta('Error', 'No se pudo eliminar el usuario. ' + (err.error?.message || err.message || ''));
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  toggleEstadoUsuario(usuario: Usuario) {
    if (usuario.activo) {
      this.desactivarUsuario(usuario.id);
    } else {
      this.activarUsuario(usuario.id);
    }
  }

  activarUsuario(id: number) {
    this.usuarioService.activarUsuario(id).subscribe(() => {
      console.log('Usuario activado exitosamente');
      this.getUsuarios();
      this.usuarioSeleccionado = null;
    });
  }

  desactivarUsuario(id: number) {
    this.usuarioService.desactivarUsuario(id).subscribe(() => {
      console.log('Usuario desactivado exitosamente');
      this.getUsuarios();
      this.usuarioSeleccionado = null;
    });
  }

  getUsuario(id: number) {
    this.usuarioService.getUsuario(id).subscribe((usuario: Usuario) => {
      this.usuarios = [usuario];
      console.log('Usuario cargado:', this.usuarios);
    });
  }

  updateUsuario(id: number, usuarioData: any) {
    // 1. Update basic info
    this.usuarioService.updateUsuario(id, usuarioData).pipe(
      // 2. If role is present in form, update roles separately
      switchMap((usuarioActualizado) => {
        if (usuarioData.rol) {
          // Backend expects an array of roles
          return this.usuarioService.asignarRoles(id, [usuarioData.rol]);
        }
        return of(usuarioActualizado);
      })
    ).subscribe({
      next: () => {
        console.log('Usuario actualizado correctamente (info y rol)');
        this.getUsuarios();
        this.cerrarFormulario();
        this.mostrarAlerta('Éxito', 'Usuario actualizado correctamente');
      },
      error: (err) => {
        console.error('Error actualizando usuario', err);
        this.mostrarAlerta('Error', 'No se pudo actualizar el usuario completamente.');
      }
    });
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }
}
