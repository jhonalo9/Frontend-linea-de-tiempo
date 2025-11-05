import { Component, OnInit,OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../environment/environment';
import { Subscription } from 'rxjs';

declare var google: any;
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule ,CommonModule,ReactiveFormsModule, RouterModule],
})
export class LoginComponent implements OnInit,OnDestroy {

 credentials: LoginRequest = {
    email: '',
    password: ''
  };

  loginForm: FormGroup;
  mensaje: string = '';
  isLoading = false;
  errorMessage = '';

  rateLimitError = '';
  private rateLimitSubscription: Subscription;

  // Timer para mostrar cuenta regresiva
  retryAfterSeconds: number = 0;
  private countdownInterval: any;

  get hasRateLimitError(): boolean {
    return this.rateLimitError !== '';
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
    // Suscribirse a los errores de rate limiting
    this.rateLimitSubscription = this.authService.rateLimitError$.subscribe(
      error => {
        this.rateLimitError = error;
        this.startCountdown();
      }
    );
  }

  //CON GOOGLE
  ngOnInit(): void {
     this.initializeGoogleSignIn();
  }

  ngOnDestroy(): void {
    if (this.rateLimitSubscription) {
      this.rateLimitSubscription.unsubscribe();
    }
    this.clearCountdown();
  }

   private initializeGoogleSignIn(): void {
    // Cargar el script de Google Identity Services si no está disponible
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }



  private startCountdown(): void {
    this.clearCountdown();
    
    // Intentar extraer el tiempo de espera del mensaje de error
    const match = this.rateLimitError.match(/Intenta de nuevo en (\d+) segundos/);
    if (match && match[1]) {
      this.retryAfterSeconds = parseInt(match[1], 10);
      
      this.countdownInterval = setInterval(() => {
        if (this.retryAfterSeconds > 0) {
          this.retryAfterSeconds--;
        } else {
          this.clearCountdown();
          this.rateLimitError = '';
          this.authService.clearRateLimitError();
        }
      }, 1000);
    }
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }


   // Método para formatear el tiempo restante
  getFormattedCountdown(): string {
    const minutes = Math.floor(this.retryAfterSeconds / 60);
    const seconds = this.retryAfterSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

   onGoogleLogin(): void {
    this.isLoading = true;
    this.errorMessage = '';
    

    // Usar Google Identity Services para el login
    const client = google.accounts.oauth2.initCodeClient({
      client_id: environment.googleClientId, // Reemplaza con tu Client ID
      scope:  'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
      ux_mode: 'popup',
      redirect_uri: 'http://localhost:4200',
      callback: (response: any) => {
        this.handleGoogleAuth(response.code);
      },
    });

    client.requestCode();
  }

   private handleGoogleAuth(authorizationCode: string): void {
    this.authService.loginWithGoogle(authorizationCode).subscribe({
      next: (res) => {
        this.isLoading = false;
        console.log('Login con Google exitoso:', res);
        
        // Redirigir según el rol
        if (res.usuario.rol === 'ADMIN') {
          this.router.navigate(['/admin/home']);
        } else {
          this.router.navigate(['/plantillas']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error en login con Google', err);
        
        if (err.status === 401) {
          this.errorMessage = 'Error en autenticación con Google';
        } else if (err.status === 0) {
          this.errorMessage = 'Error de conexión con el servidor';
        } else {
          this.errorMessage = err.error?.message || 'Error en el login con Google';
        }
      }
    });
  }


  //================================================

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.mensaje = '';
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        //console.log('Respuesta login:', res);
        
        // CORREGIDO: Acceder al rol a través de usuario.rol
        if (res.usuario.rol === 'ADMIN') { // ← Cambiado de 'admin' a 'ADMIN' (mayúsculas)
          this.router.navigate(['/admin/home']);
        } else {
          this.router.navigate(['/plantillas']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error en login', err);
        
        if (err.status === 429) {
          // El error 429 ya se maneja en el servicio
          this.rateLimitError = err.error?.message || 'Demasiados intentos. Por favor, espera un momento.';
        } else if (err.status === 401) {
          this.errorMessage = 'Credenciales inválidas';
        } else if (err.status === 0) {
          this.errorMessage = 'Error de conexión con el servidor';
        } else {
          this.errorMessage = err.error?.message || 'Error en el login';
        }
      }
    });
  }

  // Métodos de conveniencia para acceder a los controles del formulario
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }



}







