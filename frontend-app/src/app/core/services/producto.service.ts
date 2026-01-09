import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {Producto} from '../models'
@Injectable({
  providedIn: 'root',
})
export class ProductosServices {
  apiUrl = environment.apiUrl + '/productos'
  
  private _productoChanged = new Subject<void>();
  productoChanged$ = this._productoChanged.asObservable();

  constructor(private http:HttpClient ){}
  
     listarProductos(): Observable<Producto[]>{
      return this.http.get<Producto[]>(`${this.apiUrl}`)
     }
  
  
     buscarProductosById(id:number): Observable<Producto>{
      return this.http.get<Producto>(`${this.apiUrl}/${id}`)
     }
    
     
    
     crearProductos(data: Producto): Observable<Producto>{
      return this.http.post<Producto>(`${this.apiUrl}`, data).pipe(
        tap(() => this._productoChanged.next())
      )
     }
     
    
     actualizarProductos(data:Producto, id:number): Observable<Producto>{
       return this.http.put<Producto>(`${this.apiUrl}/${id}`, data).pipe(
         tap(() => this._productoChanged.next())
       )
     }
   
     
   
     eliminarProductos(id: number): Observable<Producto> {
    return this.http.delete<Producto>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this._productoChanged.next())
    );
  }
  
}