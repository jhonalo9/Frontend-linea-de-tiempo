import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProyectoService } from '../../core/services/proyecto.service';
import { HeaderComponent } from "../header/header.component";
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-preview-proyect',
  imports: [FormsModule, HeaderComponent,CommonModule],
  templateUrl: './preview-proyect.component.html',
  styleUrl: './preview-proyect.component.css'
})
export class PreviewProyectComponent {
    titulo: string = '';
  descripcion: string = '';

  tituloError: string = '';
  descripcionError: string = '';

  plantillaNombre: string = '';

  constructor(
    private router: Router,
    private proyectoService: ProyectoService
  ) {}

  ngOnInit(): void {
    // ✅ Verificar si hay plantilla cargada
    const proyectoTemporal = this.proyectoService.getProyectoTemporal();
    
    if (proyectoTemporal?.plantillaData) {
      this.plantillaNombre = proyectoTemporal.plantillaData.nombre || 
                            proyectoTemporal.plantillaData.titulo || 
                            'Plantilla seleccionada';
      //console.log('Plantilla detectada:', this.plantillaNombre);
    } else {
      console.log('No hay plantilla seleccionada');
    }
  }

  
  empezar(): void {
    // Validaciones
    this.tituloError = '';
    this.descripcionError = '';

    if (!this.titulo.trim()) {
      this.tituloError = 'El título es obligatorio';
      return;
    }

    if (this.titulo.length < 3) {
      this.tituloError = 'El título debe tener al menos 3 caracteres';
      return;
    }

    // ✅ Actualizar solo metadatos (mantiene plantilla)
    this.proyectoService.actualizarMetadatos(this.titulo, this.descripcion);

    // ✅ DEBUG: Verificar datos antes de navegar
    const datosFinales = this.proyectoService.getProyectoTemporal();

    // Redirigir al editor
    this.router.navigate(['/editor']);
  }

}
