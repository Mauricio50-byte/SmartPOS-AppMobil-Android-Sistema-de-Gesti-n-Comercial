import { Injectable, inject, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private injector = inject(Injector);
  private router = inject(Router);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const auth = this.injector.get(AuthService);
    const token = auth.getToken();
    
    // Permitir URLs relativas (para producción/tunnel) y absolutas (dev)
    const isApi = req.url.startsWith('http') || !req.url.startsWith('./'); 
    // O simplemente asumimos que si tenemos token y no es login, lo mandamos.
    // Pero mejor ser específicos: si es relativa (empieza con /) o absoluta http(s)
    const isValidUrl = req.url.startsWith('/') || req.url.startsWith('http');
    
    const isLogin = req.url.includes('/auth/ingresar');
    
    // Adjuntar token si existe, es una URL válida y no es el endpoint de login
    const shouldAttach = token && isValidUrl && !isLogin;
    
    const authReq = shouldAttach ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          const onLoginPage = this.router.url.startsWith('/login');
          if (!isLogin) {
            auth.logout();
            if (!onLoginPage) this.router.navigate(['/login']);
          }
        }
        return throwError(() => err);
      })
    );
  }
}
