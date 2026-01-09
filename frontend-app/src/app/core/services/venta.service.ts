import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Venta } from '../models';

@Injectable({
  providedIn: 'root',
})
export class VentaServices {
  apiUrl = environment.apiUrl + '/ventas';

  constructor(private http: HttpClient) {}

  listarVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.apiUrl);
  }

  obtenerVentaPorId(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }


  
  crearVenta(data: any): Observable<Venta> {
    return this.http.post<Venta>(this.apiUrl, data);
  }



}