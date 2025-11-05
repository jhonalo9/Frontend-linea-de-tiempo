import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService, CurrentUser } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../components/header/header.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-upgrade-premium',
  templateUrl: './upgrade-premium.component.html',
  styleUrls: ['./upgrade-premium.component.css'],
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule]
})
export class UpgradePremiumComponent implements OnInit {
  usuario: CurrentUser | null = null;
  cargando = false;
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'info' = 'info';
  mostrarMensaje = false;
  mostrarModal = false;
  pagoExitoso = false;
  planSeleccionado: 'mensual' | 'anual' = 'mensual';
  esAnual = false; // Para determinar si el usuario tiene plan anual

  // Datos del formulario de pago
  datosPago = {
    numeroTarjeta: '',
    fechaExpiracion: '',
    cvv: '',
    nombreTitular: '',
    email: ''
  };

  today = new Date();

  constructor(
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarUsuarioActual();
  }

  cargarUsuarioActual(): void {
    this.usuario = this.authService.getCurrentUser();
    
    if (!this.usuario) {
      this.mostrarAlerta('Debes iniciar sesión para acceder a esta función', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Aquí podrías determinar si el usuario tiene plan anual basándote en datos adicionales
    // Por ahora, asumimos que si es PREMIUM, es mensual
    this.esAnual = false;
  }

  seleccionarPlan(plan: 'mensual' | 'anual'): void {
    if (this.usuario?.plan === 'PREMIUM') {
      this.mostrarAlerta('Ya tienes una cuenta Premium', 'info');
      return;
    }

    this.planSeleccionado = plan;
    this.mostrarModal = true;
    
    // Pre-llenar el email si está disponible
    if (this.usuario?.email) {
      this.datosPago.email = this.usuario.email;
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    // Limpiar formulario
    this.datosPago = {
      numeroTarjeta: '',
      fechaExpiracion: '',
      cvv: '',
      nombreTitular: '',
      email: this.usuario?.email || ''
    };
  }

  cerrarModalExito(): void {
    this.pagoExitoso = false;
    this.router.navigate(['/dashboard']);
  }

  procesarPago(): void {
    if (!this.validarDatosPago()) {
      this.mostrarAlerta('Por favor, completa todos los campos correctamente', 'error');
      return;
    }

    this.cargando = true;
    
    // Simular procesamiento de pago
    setTimeout(() => {
      this.confirmarUpgrade();
    }, 2000);
  }

  confirmarUpgrade(): void {
    this.usuarioService.upgradeAPremium().subscribe({
      next: (usuarioActualizado) => {
        this.cargando = false;
        this.mostrarModal = false;
        this.usuario = this.authService.getCurrentUser();
        this.pagoExitoso = true;
        
        // Si es plan anual, actualizar la bandera
        if (this.planSeleccionado === 'anual') {
          this.esAnual = true;
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error en upgrade:', error);
        
        let mensajeError = 'Error al procesar el upgrade. Intenta nuevamente.';
        if (error.status === 403) {
          mensajeError = 'No tienes permisos para realizar esta acción';
        } else if (error.status === 401) {
          mensajeError = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        
        this.mostrarAlerta(mensajeError, 'error');
      }
    });
  }

  validarDatosPago(): boolean {
    return (
      this.datosPago.numeroTarjeta.replace(/\s/g, '').length === 16 &&
      this.datosPago.fechaExpiracion.length === 5 &&
      this.datosPago.cvv.length === 3 &&
      this.datosPago.nombreTitular.trim().length > 0 &&
      this.datosPago.email.includes('@')
    );
  }

  mostrarAlerta(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.mensaje = mensaje;
    this.tipoMensaje = tipo;
    this.mostrarMensaje = true;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.mostrarMensaje = false;
    }, 5000);
  }

  cerrarAlerta(): void {
    this.mostrarMensaje = false;
  }

  formatearNumeroTarjeta(event: any): void {
    let value = event.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 16) value = value.substring(0, 16);
    
    const matches = value.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      this.datosPago.numeroTarjeta = parts.join(' ');
    } else {
      this.datosPago.numeroTarjeta = value;
    }
  }

  formatearFechaExpiracion(event: any): void {
    let value = event.target.value.replace(/\//g, '').replace(/[^0-9]/gi, '');
    if (value.length > 4) value = value.substring(0, 4);
    
    if (value.length >= 2) {
      this.datosPago.fechaExpiracion = value.substring(0, 2) + '/' + value.substring(2);
    } else {
      this.datosPago.fechaExpiracion = value;
    }
  }
}