import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PlantillaService, Plantilla, PlantillaEstadisticaDTO } from '../../core/services/plantilla.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
import { FavoritoService } from '../../core/services/favorito.service';
import { ProyectoService} from '../../core/services/proyecto.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    CommonModule, 
    RouterModule,
    HeaderComponent
  ],
})
export class HomeComponent implements OnInit {
isLoggedIn = false;
  plantillas: Plantilla[] = []; 
  isLoading = true;

  constructor(
    private authService: AuthService,
    private plantillaService: PlantillaService,
    private favoritoService: FavoritoService,
    private proyectoService:ProyectoService,
    private router: Router

  ) {}

  modalVisible = false;
  plantillaSeleccionada: any = null;

  abrirModal(plantilla: any, event: Event) {
    event.stopPropagation();
    this.plantillaSeleccionada = plantilla;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.plantillaSeleccionada = null;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      // ✅ Siempre cargar las 12 plantillas más populares
      this.cargarPlantillasPopulares();
    });
  }

  // ✅ SOLO 12 PLANTILLAS MÁS POPULARES
cargarPlantillasPopulares(): void {
  this.isLoading = true;
  
  this.plantillaService.getPlantillasPopulares().subscribe({
    next: (plantillasPopulares: PlantillaEstadisticaDTO[]) => {
      
      const plantillasLimitadas = plantillasPopulares.slice(0, 12);
      
      // ✅ OBTENER PLANTILLAS COMPLETAS
      this.obtenerPlantillasCompletas(plantillasLimitadas);
    },
    error: (error) => {
      console.error('Error al cargar plantillas populares:', error);
      this.isLoading = false;
      this.plantillas = [];
    }
  });
}


private obtenerPlantillasCompletas(plantillasPopulares: PlantillaEstadisticaDTO[]): void {
  if (plantillasPopulares.length === 0) {
    this.plantillas = [];
    this.isLoading = false;
    return;
  }

  const requests = plantillasPopulares.map(popular => 
    this.plantillaService.getPlantillaById(popular.id)
  );

  forkJoin(requests).subscribe({
    next: (plantillasCompletas: Plantilla[]) => {
      // ✅ PROCESAR plantillas igual que FullPlantillasComponent
      this.plantillas = plantillasCompletas.map(plantilla => {
        // ✅ Parsear data si es string
        const dataParsed = this.plantillaService.parsePlantillaData(plantilla);
        const portadaUrl = this.getPlantillaImage(plantilla);
        
        return {
          ...plantilla,
          data: dataParsed,  // ✅ Asegurar que data está parseada
          portadaUrl: portadaUrl,
          favorito: false
        };
      });
      
      this.cargarEstadosFavoritos();
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error al cargar plantillas completas:', error);
      console.warn('Usando fallback con datos básicos');
      this.plantillas = this.convertirYProcesarPlantillas(plantillasPopulares);
      this.cargarEstadosFavoritos();
      this.isLoading = false;
    }
  });
}

 private convertirYProcesarPlantillas(plantillasPopulares: PlantillaEstadisticaDTO[]): Plantilla[] {
  return plantillasPopulares.map(popular => {
    // ✅ Parsear data si es string
    let dataParsed = popular.data || {};
    if (typeof popular.data === 'string') {
      try {
        dataParsed = JSON.parse(popular.data);
      } catch (error) {
        console.warn(`Error parseando data de ${popular.nombre}:`, error);
        dataParsed = {};
      }
    }

    const plantilla: Plantilla = {
      id: popular.id,
      nombre: popular.nombre,
      descripcion: popular.descripcion,
      data: dataParsed,  // ✅ Usar data parseada
      estado: 'ACTIVA',
      esPublica: popular.esPublica || true,
      creadoPorId: popular.creadoPorId || 0,
      creadoPorNombre: popular.creadoPorNombre,
      fechaCreacion: popular.fechaCreacion,
      favorito: false
    };

    (plantilla as any).portadaUrl = 'assets/images/placeholder-template.png';
    return plantilla;
  });
}

private obtenerPortadaDesdePlantillaPopular(plantilla: PlantillaEstadisticaDTO): string {
  // 1. Verificar si hay portadaUrl directa en el DTO
  if (plantilla.portadaUrl) {
    return plantilla.portadaUrl;
  }

  // 2. Si hay data, intentar extraer la portada
  if (plantilla.data) {
    let dataParsed = plantilla.data;
    
    // Si data es string, parsearlo
    if (typeof plantilla.data === 'string') {
      try {
        dataParsed = JSON.parse(plantilla.data);
      } catch (error) {
        console.warn(`Error parseando data de ${plantilla.nombre}:`, error);
        return 'assets/images/placeholder-template.png';
      }
    }
    
    // Buscar portada en la estructura de datos
    if (dataParsed?.portadaUrl) {
      return dataParsed.portadaUrl;
    }
    
    if (dataParsed?.configuracionVisual?.portadaUrl) {
      return dataParsed.configuracionVisual.portadaUrl;
    }
  }

  // 3. Si no se encuentra portada, usar placeholder
  return 'assets/images/placeholder-template.png';
}


  private obtenerPortadaPlantilla(plantilla: PlantillaEstadisticaDTO, dataParsed: any): string {
  // 1. Intentar desde la propiedad directa de PlantillaEstadisticaDTO
  if (plantilla.portadaUrl) {
    return plantilla.portadaUrl;
  }

  // 2. Intentar desde dataParsed.portadaUrl
  if (dataParsed?.portadaUrl) {
    return dataParsed.portadaUrl;
  }

  // 3. Intentar desde dataParsed.configuracionVisual?.portadaUrl
  if (dataParsed?.configuracionVisual?.portadaUrl) {
    return dataParsed.configuracionVisual.portadaUrl;
  }

  // 4. Si data es string, intentar parsear nuevamente buscando específicamente la portada
  if (typeof plantilla.data === 'string') {
    try {
      const stringData = JSON.parse(plantilla.data);
      if (stringData.portadaUrl) return stringData.portadaUrl;
      if (stringData.configuracionVisual?.portadaUrl) return stringData.configuracionVisual.portadaUrl;
    } catch (e) {
      console.warn('No se pudo parsear data como JSON:', e);
    }
  }

  console.warn(`❌ No se encontró portada para plantilla: ${plantilla.nombre}`);
  return 'assets/images/placeholder-template.png';
}

  // ✅ NUEVO MÉTODO: Parsear datos de PlantillaEstadisticaDTO
  private parsePlantillaEstadisticaData(plantilla: PlantillaEstadisticaDTO): any {
    if (typeof plantilla.data === 'string') {
      try {
        return JSON.parse(plantilla.data);
      } catch (error) {
        console.error('Error parseando data de plantilla estadística:', error);
        return {};
      }
    }
    return plantilla.data;
  }

  cargarEstadosFavoritos(): void {
    if (!this.isLoggedIn) return;

    this.plantillas.forEach(plantilla => {
      this.favoritoService.verificarFavorito(plantilla.id).subscribe({
        next: (favoritoInfo) => {
          plantilla.favorito = favoritoInfo.esFavorita;
        },
        error: (error) => {
          console.error(`Error al verificar favorito para plantilla ${plantilla.id}:`, error);
          plantilla.favorito = false;
        }
      });
    });
  }

  toggleFavoritoModal(plantilla: any, event: Event): void {
    event.stopPropagation();
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const estadoAnterior = plantilla.favorito;
    plantilla.favorito = !plantilla.favorito;

    this.favoritoService.toggleFavorito(plantilla.id).subscribe({
      next: (response) => {
        //console.log('Favorito actualizado desde modal:', response.message);
        
        const plantillaEnLista = this.plantillas.find(p => p.id === plantilla.id);
        if (plantillaEnLista) {
          plantillaEnLista.favorito = plantilla.favorito;
        }
      },
      error: (error) => {
        console.error('Error al alternar favorito desde modal:', error);
        plantilla.favorito = estadoAnterior;
        alert('Error al actualizar favorito. Intenta nuevamente.');
      }
    });
  }

  toggleFavorito(plantilla: any, event: Event): void {
    event.stopPropagation();
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const estadoAnterior = plantilla.favorito;
    plantilla.favorito = !plantilla.favorito;

    this.favoritoService.toggleFavorito(plantilla.id).subscribe({
      next: (response) => {
        //console.log('Favorito actualizado:', response.message);
      },
      error: (error) => {
        console.error('Error al alternar favorito:', error);
        plantilla.favorito = estadoAnterior;
        alert('Error al actualizar favorito. Intenta nuevamente.');
      }
    });
  }

getPlantillaImage(plantilla: Plantilla): string {
  // 1. Verificar si ya tenemos una portadaUrl asignada
  if ((plantilla as any).portadaUrl && (plantilla as any).portadaUrl !== 'assets/images/placeholder-template.png') {
    return (plantilla as any).portadaUrl;
  }

  // 2. Si no hay data, retornar placeholder inmediatamente
  if (!plantilla.data || Object.keys(plantilla.data).length === 0) {
    return 'assets/images/placeholder-template.png';
  }

  // 3. Intentar extraer portada de la data
  let dataParsed = plantilla.data;
  
  // Si data es string, parsearlo
  if (typeof plantilla.data === 'string') {
    try {
      dataParsed = JSON.parse(plantilla.data);
    } catch (error) {
      console.warn(`Error parseando data de ${plantilla.nombre}:`, error);
      return 'assets/images/placeholder-template.png';
    }
  }

  // Buscar portada en diferentes ubicaciones
  if (dataParsed?.portadaUrl) {
    return dataParsed.portadaUrl;
  }

  if (dataParsed?.configuracionVisual?.portadaUrl) {
    return dataParsed.configuracionVisual.portadaUrl;
  }

  // 4. Fallback a placeholder
  return 'assets/images/placeholder-template.png';
}
  onImageError(event: any, plantilla: Plantilla): void {
    const img = event.target;
    console.warn(`❌ Error cargando imagen para plantilla ${plantilla.id}:`, plantilla.nombre);
    img.src = 'assets/images/placeholder-template.png';
  }

  crearProyecto(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/plantillas']);
    } else {
      this.router.navigate(['/login']);
    }
  }


  usarPlantilla(plantilla: any): void {
  // ✅ Asegurar que data está parseada
  const dataParsed = plantilla.data || this.plantillaService.parsePlantillaData(plantilla);
  
  const plantillaProcesada = {
    ...plantilla,
    data: dataParsed
  };

  

  this.proyectoService.setProyectoTemporal({
    titulo: '',
    descripcion: '',
    plantillaId: plantilla.id,
    plantillaData: plantillaProcesada 
  });

  if (this.authService.isLoggedIn()) {
    this.router.navigate(['/usuario/descripcion-proyect'], {
      queryParams: { plantillaId: plantilla.id }
    });
  } else {
    this.router.navigate(['/login']);
  }
}

  getPlantillaTheme(plantilla: Plantilla): string {
    const data = this.plantillaService.parsePlantillaData(plantilla);
    return data?.theme || 'default';
  }

  getPlantillaColor(plantilla: Plantilla): string {
    const data = this.plantillaService.parsePlantillaData(plantilla);
    return data?.color || '#007bff';
  }
}