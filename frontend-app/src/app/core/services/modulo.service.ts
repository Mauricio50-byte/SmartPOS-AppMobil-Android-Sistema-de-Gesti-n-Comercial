import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  tipo?: 'SISTEMA' | 'NEGOCIO';
  config?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModuloService {
  private apiUrl = `${environment.apiUrl}/modulos`;

  constructor(private http: HttpClient) {}

  listarModulos(negocioId?: number): Observable<Modulo[]> {
    const url = typeof negocioId === 'number' ? `${this.apiUrl}?negocioId=${negocioId}` : this.apiUrl;
    return this.http.get<Modulo[]>(url);
  }

  toggleModulo(id: string, activo: boolean, negocioId?: number): Observable<Modulo> {
    const url =
      typeof negocioId === 'number'
        ? `${this.apiUrl}/${id}/toggle?negocioId=${negocioId}`
        : `${this.apiUrl}/${id}/toggle`;
    return this.http.patch<Modulo>(url, { activo });
  }

  actualizarConfig(id: string, config: any): Observable<Modulo> {
    return this.http.put<Modulo>(`${this.apiUrl}/${id}/config`, { config });
  }
}
