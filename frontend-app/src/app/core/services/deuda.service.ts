import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Deuda, Abono } from '../models';

@Injectable({
    providedIn: 'root'
})
export class DeudaService {
    private apiUrl = `${environment.apiUrl}/deudas`;
    private abonosUrl = `${environment.apiUrl}/abonos`;

    constructor(private http: HttpClient) { }

    /**
     * Listar todas las deudas con filtros opcionales
     */
    listarDeudas(filtro?: { estado?: string; clienteId?: number }): Observable<Deuda[]> {
        let params: any = {};
        if (filtro?.estado) params.estado = filtro.estado;
        if (filtro?.clienteId) params.clienteId = filtro.clienteId.toString();

        return this.http.get<Deuda[]>(this.apiUrl, { params });
    }

    /**
     * Obtener deudas pendientes de un cliente
     */
    obtenerDeudasPorCliente(clienteId: number): Observable<Deuda[]> {
        return this.http.get<Deuda[]>(`${this.apiUrl}/cliente/${clienteId}`);
    }

    /**
     * Obtener una deuda específica
     */
    obtenerDeudaPorId(id: number): Observable<Deuda> {
        return this.http.get<Deuda>(`${this.apiUrl}/${id}`);
    }

    /**
     * Registrar un abono a una deuda
     */
    registrarAbono(deudaId: number, datos: {
        monto: number;
        metodoPago: string;
        nota?: string;
    }): Observable<{ abono: Abono; deudaActualizada: Deuda }> {
        return this.http.post<{ abono: Abono; deudaActualizada: Deuda }>(
            `${this.apiUrl}/${deudaId}/abonos`,
            datos
        );
    }

    /**
     * Obtener historial de abonos de un cliente
     */
    obtenerAbonosPorCliente(clienteId: number): Observable<Abono[]> {
        return this.http.get<Abono[]>(`${this.abonosUrl}/cliente/${clienteId}`);
    }

    /**
     * Marcar deudas vencidas
     */
    marcarDeudasVencidas(): Observable<any> {
        return this.http.post(`${this.apiUrl}/marcar-vencidas`, {});
    }
}
