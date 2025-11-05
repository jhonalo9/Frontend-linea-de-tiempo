import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ CORREGIDO: Identificar correctamente las URLs públicas
    if (this.isPublicRequest(req)) {
      //console.log('🔓 Request pública, sin token:', req.url);
      return next.handle(req);
    }

    const token = this.authService.getToken();
    
    if (!token) {
     // console.log('⚠️ URL requiere auth pero no hay token:', req.url);
      return next.handle(req); // Dejar que el backend maneje la falta de token
    }

    if (!this.authService.isTokenValid(token)) {
      //console.log('❌ Token expirado para:', req.url);
      this.authService.logout();
      return next.handle(req);
    }

    // Solo agregar auth header a URLs que lo requieren
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    //console.log('🔐 Request con token:', req.url);
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error))
    );
  }

  private isPublicRequest(req: HttpRequest<any>): boolean {
    const url = req.url;
    
    // ✅ URLs absolutamente públicas (sin auth required)
    const publicUrls = [
      '/api/auth/login',
      '/api/auth/registro',
      //'/api/plantillas' // ✅ Plantillas públicas NO requieren auth
      '/api/plantillas/publicas',

    ];

    // ✅ URLs de admin que SÍ requieren auth
    const adminUrls = [
      '/api/plantillas/admin',
      '/api/proyectos/'
    ];

    // Si es una URL pública exacta, no agregar auth
    if (publicUrls.some(publicUrl => url === publicUrl || url.includes(publicUrl))) {
      return true;
    }

    // Si es una URL de admin, requiere auth
    if (adminUrls.some(adminUrl => url.includes(adminUrl))) {
      return false;
    }

    // Por defecto, asumir que requiere auth para otras APIs
    return !url.includes('/api/');
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    /*console.error('❌ Interceptor Error:', {
      status: error.status,
      url: error.url,
      message: error.message
    });*/

    if (error.status === 401 || error.status === 403) {
      //console.log('🔑 Error de autenticación, verificando estado...');
      
      // Solo logout si realmente había un usuario logueado
      if (this.authService.isLoggedIn()) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    }

    return throwError(() => error);
  }
}