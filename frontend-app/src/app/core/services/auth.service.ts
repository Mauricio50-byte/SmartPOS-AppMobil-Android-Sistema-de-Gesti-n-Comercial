import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UsuarioPerfil, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private tokenKey = 'auth_token';
  private rememberKey = 'remember_email';
  private perfil$ = new BehaviorSubject<UsuarioPerfil | null>(null);
  private http = inject(HttpClient);
  private perfilSubscription: Subscription | undefined;

  // Token management - In-memory only for security on refresh/close
  private token: string | null = null;

  constructor() {
    // No persistence on refresh/close as requested
  }

  validarYRefrescarPerfil() {
    if (this.perfilSubscription) this.perfilSubscription.unsubscribe();
    this.perfilSubscription = this.fetchPerfil().subscribe({
      next: (p) => this.perfil$.next(p),
      error: (err) => { if (err?.status === 401) this.logout(); }
    });
  }

  ngOnDestroy(): void {
    if (this.perfilSubscription) {
      this.perfilSubscription.unsubscribe();
    }
  }

  login(correo: string, password: string, remember: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/ingresar`, { correo, password }).pipe(
      tap((resp) => {
        this.setToken(resp.token);
        this.perfil$.next(resp.usuario);
        if (remember) localStorage.setItem(this.rememberKey, correo);
        else localStorage.removeItem(this.rememberKey);
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/registrar`, data).pipe(
      tap((resp: any) => {
        // Automatically login after register if backend returns token, or just return success
        if (resp && resp.token) {
          this.setToken(resp.token);
          if (resp.usuario) this.perfil$.next(resp.usuario);
        }
      })
    );
  }

  fetchPerfil(): Observable<UsuarioPerfil> {
    return this.http.get<{ usuario: UsuarioPerfil }>(`${environment.apiUrl}/auth/perfil`).pipe(
      tap(({ usuario }) => this.perfil$.next(usuario)),
      map(({ usuario }) => usuario)
    );
  }

  getPerfil$(): Observable<UsuarioPerfil | null> { return this.perfil$.asObservable(); }

  hasPermission(clave: string): boolean {
    const perfil = this.perfil$.value;
    if (!perfil) return false;
    
    // Admin global
    if (perfil.adminPorDefecto && perfil.roles?.includes('ADMIN')) return true;
    
    // Permiso explícito
    return perfil.permisos?.includes(clave) || false;
  }

  getRememberedEmail(): string { return localStorage.getItem(this.rememberKey) || ''; }

  setToken(token: string): void {
    this.token = token;
  }
  getToken(): string | null { return this.token; }
  logout(): void {
    this.token = null;
    this.perfil$.next(null);
  }
}
