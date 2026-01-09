import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Gasto, PagoGasto } from '../models/gasto';

@Injectable({
  providedIn: 'root'
})
export class GastoService {
  private apiUrl = `${environment.apiUrl}/gastos`;

  constructor(private http: HttpClient) { }

  listarGastos(filtro?: { estado?: string }): Observable<Gasto[]> {
    let params: any = {};
    if (filtro?.estado) params.estado = filtro.estado;
    return this.http.get<Gasto[]>(this.apiUrl, { params });
  }

  crearGasto(datos: Partial<Gasto>): Observable<Gasto> {
    return this.http.post<Gasto>(this.apiUrl, datos);
  }

  registrarPago(gastoId: number, datos: { monto: number, metodoPago: string, nota?: string }): Observable<{ pago: PagoGasto, gasto: Gasto }> {
    return this.http.post<{ pago: PagoGasto, gasto: Gasto }>(`${this.apiUrl}/${gastoId}/pagos`, datos);
  }

  obtenerResumen(): Observable<{ totalPorCobrar: number, totalPorPagar: number }> {
    return this.http.get<{ totalPorCobrar: number, totalPorPagar: number }>(`${this.apiUrl}/resumen`);
  }
}
