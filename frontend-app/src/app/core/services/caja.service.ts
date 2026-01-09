import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Caja, MovimientoCaja } from '../models/caja';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CajaService {
  private apiUrl = `${environment.apiUrl}/caja`;

  constructor(private http: HttpClient) { }

  abrirCaja(montoInicial: number, observaciones?: string): Observable<Caja> {
    return this.http.post<Caja>(`${this.apiUrl}/abrir`, { montoInicial, observaciones });
  }

  cerrarCaja(montoFinal: number, observaciones?: string): Observable<Caja> {
    return this.http.post<Caja>(`${this.apiUrl}/cerrar`, { montoFinal, observaciones });
  }

  registrarMovimiento(tipo: 'INGRESO' | 'EGRESO', monto: number, descripcion: string): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${this.apiUrl}/movimiento`, { tipo, monto, descripcion });
  }

  obtenerEstadoCaja(): Observable<Caja> {
    return this.http.get<Caja>(`${this.apiUrl}/estado`);
  }

  obtenerHistorial(filtros: { fechaInicio?: string, fechaFin?: string, usuarioId?: number }): Observable<Caja[]> {
    let params = new HttpParams();
    if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    if (filtros.usuarioId) params = params.set('usuarioId', filtros.usuarioId.toString());

    return this.http.get<Caja[]>(`${this.apiUrl}/historial`, { params });
  }

  obtenerEstadisticas(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);

    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { params });
  }
}
