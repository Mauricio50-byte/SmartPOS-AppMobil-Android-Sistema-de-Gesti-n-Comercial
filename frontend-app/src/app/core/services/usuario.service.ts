import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los usuarios, con opción de filtrado.
   * @param filtro Objeto con opciones de filtro (rol, activo).
   * @returns Un Observable con un arreglo de usuarios.
   */
  getUsuarios(filtro?: { rol?: string, activo?: boolean }): Observable<Usuario[]> {
    let params = new HttpParams();
    if (filtro) {
      if (filtro.rol) {
        params = params.set('rol', filtro.rol);
      }
      if (typeof filtro.activo !== 'undefined') {
        params = params.set('activo', String(filtro.activo));
      }
    }
    return this.http.get<Usuario[]>(this.apiUrl, { params });
  }

  /**
   * Obtener un usuario específico por su ID.
   * @param id El ID del usuario.
   * @returns Un Observable con el usuario encontrado.
   */
  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo usuario.
   * @param usuario El objeto de usuario a crear.
   * @returns Un Observable con el usuario creado.
   */
  createUsuario(usuario: Partial<Usuario> & { password?: string }): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  /**
   * Actualizar un usuario existente.
   * @param id El ID del usuario a actualizar.
   * @param usuario El objeto de usuario con los datos actualizados.
   * @returns Un Observable con el usuario actualizado.
   */
  updateUsuario(id: number, usuario: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, usuario);
  }

  /**
   * Cambia la contraseña de un usuario.
   * @param id El ID del usuario.
   * @param nueva La nueva contraseña.
   */
  cambiarPassword(id: number, nueva: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/password`, { nueva });
  }

  /**
   * Activa un usuario.
   * @param id El ID del usuario a activar.
   */
  activarUsuario(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/activar`, {});
  }

  /**
   * Desactiva un usuario.
   * @param id El ID del usuario a desactivar.
   */
  desactivarUsuario(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/desactivar`, {});
  }

  /**
   * Elimina un usuario.
   * @param id El ID del usuario a eliminar.
   */
  deleteUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Asigna roles a un usuario.
   * @param id El ID del usuario.
   * @param roles Un arreglo con los nombres de los roles a asignar.
   */
  asignarRoles(id: number, roles: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/roles`, { roles });
  }

  /**
   * Asigna permisos directos a un usuario.
   * @param id El ID del usuario.
   * @param permisos Un arreglo con las claves de los permisos a asignar.
   */
  asignarPermisosDirectos(id: number, permisos: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/permisos`, { permisos });
  }

  asignarModulos(id: number, modulos: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/modulos`, { modulos });
  }
}
