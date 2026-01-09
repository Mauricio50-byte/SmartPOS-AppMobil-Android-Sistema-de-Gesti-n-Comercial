import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Cliente } from '../models';

export interface EstadoCuenta {
  cliente: {
    id: number;
    nombre: string;
    telefono?: string;
    creditoMaximo: number;
    saldoDeuda: number;
    puntos: number;
  };
  deudas: any[];
  creditoDisponible: number;
}

export interface ValidacionCredito {
  disponible: boolean;
  creditoMaximo: number;
  saldoDeuda: number;
  creditoDisponible: number;
  montoSolicitado: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesServices {
  apiUrl = environment.apiUrl + '/clientes'
  private clienteCreadoSource = new Subject<Cliente>();
  clienteCreado$ = this.clienteCreadoSource.asObservable();

  notificarNuevoCliente(cliente: Cliente) {
    this.clienteCreadoSource.next(cliente);
  }

  constructor(private http: HttpClient) { }

  listarClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}`)
  }

  buscarClienteById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`)
  }

  obtenerEstadoCuenta(id: number): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.apiUrl}/${id}/estado-cuenta`)
  }

  validarCredito(id: number, monto: number): Observable<ValidacionCredito> {
    return this.http.post<ValidacionCredito>(`${this.apiUrl}/${id}/validar-credito`, { monto })
  }

  crearCliente(data: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.apiUrl}`, data).pipe(
      tap((nuevo) => this.clienteCreadoSource.next(nuevo))
    )
  }


  actualizarCliente(data: Partial<Cliente>, id: number): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, data).pipe(
      tap((actualizado) => this.clienteCreadoSource.next(actualizado))
    )
  }



  eliminarCliente(id: number): Observable<Cliente> {
    return this.http.delete<Cliente>(`${this.apiUrl}/${id}`);
  }

}