import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { TemplateListItem , Categoria} from './template-list.interface';
import { AdminTemplateService } from '../../../features/admin/template-editor/admin-template.service';
import { AuthService } from '../../../core/services/auth.service';
import { VerticalHeaderComponent } from '../vertical-header/vertical-header.component';
import { ArchivoService } from '../../../core/services/archivo.service';
import { PlantillaService } from '../../../core/services/plantilla.service';

@Component({
  selector: 'app-gestion-plantillas',
  imports: [CommonModule, RouterModule, FormsModule, VerticalHeaderComponent],
  templateUrl: './gestion-plantillas.component.html',
  styleUrl: './gestion-plantillas.component.css'
})
export class GestionPlantillasComponent implements OnInit {

 // Listas de plantillas
  misPlantillas: TemplateListItem[] = [];
  plantillasPublicas: TemplateListItem[] = [];
  plantillasPrivadas: TemplateListItem[] = [];
  todasPlantillas: TemplateListItem[] = [];
  
  // Estados
  cargando: boolean = false;
  filtro: string = '';
  vista: 'mis-plantillas' | 'publicas' | 'privadas' | 'todas' = 'mis-plantillas';
  esAdmin: boolean = false;
  
  // Plantilla seleccionada para acciones
  plantillaSeleccionada: TemplateListItem | null = null;

  constructor(
    private templateListService: AdminTemplateService,
    private plantillaService:PlantillaService,
    private authService: AuthService,
    private archivoService: ArchivoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.verificarRolUsuario();
    this.cargarMisPlantillas();
  }

  /**
   * Verificar si el usuario es admin
   */
  private verificarRolUsuario(): void {
    const usuario = this.authService.getCurrentUser();
    this.esAdmin = usuario?.rol === 'ADMIN';
    console.log('👤 Rol usuario:', usuario?.rol, 'Es admin:', this.esAdmin);
  }

  /**
   * Cargar mis plantillas
   */
  vecesUsadaMap: Map<number, number> = new Map();
 async cargarMisPlantillas(): Promise<void> {
    try {
      this.cargando = true;
      
      // 🆕 CARGAR PRIMERO LAS VECES USADA
      await this.cargarVecesUsadaPlantillas();
      
      // Luego cargar las plantillas
      const plantillasRaw = await lastValueFrom(
        this.templateListService.getMisPlantillas()
      );
      
      // 🔧 MAPEAR estructura del backend al formato esperado
      this.misPlantillas = plantillasRaw.map(plantilla => this.normalizarPlantilla(plantilla));
      
    } catch (error) {
      console.error('❌ Error cargando mis plantillas:', error);
      this.mostrarError('Error al cargar tus plantillas');
    } finally {
      this.cargando = false;
    }
  }

    private async cargarVecesUsadaPlantillas(): Promise<void> {
    try {
      const plantillasMasUsadas = await lastValueFrom(
        this.templateListService.getVecesUsadaPlantillas()
      );
      
     
      
      // Limpiar el mapa antes de cargar nuevos datos
      this.vecesUsadaMap.clear();
      
      // Llenar el mapa con los datos de uso
      plantillasMasUsadas.forEach(plantilla => {
        this.vecesUsadaMap.set(plantilla.id, plantilla.conteo || 0);
       
      });
      
      
    } catch (error) {
      console.error('Error cargando veces usada:', error);
      // No mostrar error al usuario para no interrumpir la experiencia
    }
  }

  private actualizarVecesUsadaEnPlantillas(): void {
    // Actualizar misPlantillas
    this.misPlantillas.forEach(plantilla => {
      const vecesUsada = this.vecesUsadaMap.get(plantilla.id) || 0;
      if (plantilla.metadatos) {
        plantilla.metadatos.vecesUsada = vecesUsada;
      }
    });

    // Actualizar plantillasPublicas si están cargadas
    this.plantillasPublicas.forEach(plantilla => {
      const vecesUsada = this.vecesUsadaMap.get(plantilla.id) || 0;
      if (plantilla.metadatos) {
        plantilla.metadatos.vecesUsada = vecesUsada;
      }
    });

    // Actualizar plantillasPrivadas si están cargadas
    this.plantillasPrivadas.forEach(plantilla => {
      const vecesUsada = this.vecesUsadaMap.get(plantilla.id) || 0;
      if (plantilla.metadatos) {
        plantilla.metadatos.vecesUsada = vecesUsada;
      }
    });

    // Actualizar todasPlantillas si están cargadas
    this.todasPlantillas.forEach(plantilla => {
      const vecesUsada = this.vecesUsadaMap.get(plantilla.id) || 0;
      if (plantilla.metadatos) {
        plantilla.metadatos.vecesUsada = vecesUsada;
      }
    });
  }

  getVecesUsada(plantilla: TemplateListItem): number {
    // Primero buscar en el mapa
    if (this.vecesUsadaMap.has(plantilla.id)) {
      return this.vecesUsadaMap.get(plantilla.id)!;
    }
    
    // Luego buscar en los metadatos
    if (plantilla.metadatos?.vecesUsada !== undefined) {
      return plantilla.metadatos.vecesUsada;
    }
    
    // Por último, valor por defecto
    return 0;
  }



private normalizarPlantilla(plantilla: any): TemplateListItem {
  const categoria: Categoria | undefined = plantilla.categoriaNombre 
    ? {
        id: plantilla.categoriaId || 0,
        nombre: plantilla.categoriaNombre
      }
    : undefined;

    const configuracionVisual = this.parsearConfiguracionVisual(plantilla.data);
  const portadaUrl = configuracionVisual?.portadaUrl;

  const metadatos = {
    fechaCreacion: plantilla.fechaCreacion ? new Date(plantilla.fechaCreacion) : new Date(),
    fechaModificacion: plantilla.fechaModificacion ? new Date(plantilla.fechaModificacion) : new Date(),
    vecesUsada: plantilla.vecesUsada || 0,
    thumbnail: plantilla.thumbnail,
    portadaUrl: portadaUrl, // ✅ Ahora sí viene de configuracionVisual
    portada: plantilla.portada
  };

  const plantillaNormalizada: TemplateListItem = {
    id: plantilla.id,
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    esPublica: plantilla.esPublica,
    categoria: categoria,
    metadatos: metadatos,
    configuracionVisual: this.parsearConfiguracionVisual(plantilla.data),
    estado: plantilla.estado,
    creadoPorId: plantilla.creadoPorId,
    creadoPorNombre: plantilla.creadoPorNombre
  };

  return plantillaNormalizada;
}

private parsearConfiguracionVisual(data: any): any {
  if (!data) return undefined;
  
  try {
    let configData: any;
    
    if (typeof data === 'object') {
      configData = data;
    } else if (typeof data === 'string') {
      configData = JSON.parse(data);
    } else {
      return undefined;
    }

    // ✅ Extraer TODOS los campos importantes, incluyendo portadaUrl
    return {
      canvasWidth: configData.canvasWidth,
      canvasHeight: configData.canvasHeight,
      backgroundColor: configData.backgroundColor,
      portadaUrl: configData.portadaUrl, // ✅ ESTE ES EL CAMPO IMPORTANTE
      lineaDeTiempo: configData.lineaDeTiempo,
      zonasEventos: configData.zonasEventos,
      elementosDecorativos: configData.elementosDecorativos
    };
    
  } catch (error) {
    console.warn('⚠️ Error parseando configuración visual:', error);
    return undefined;
  }
}




  /**
   * Cargar plantillas públicas
   */
   async cargarPlantillasPublicas(): Promise<void> {
    try {
      this.cargando = true;
      
      // 🆕 CARGAR VECES USADA
      await this.cargarVecesUsadaPlantillas();
      
      const plantillasRaw = await lastValueFrom(
        this.templateListService.getPlantillasPublicas()
      );
      
      // 🔧 NORMALIZAR estructura del backend
      this.plantillasPublicas = plantillasRaw.map(plantilla => this.normalizarPlantilla(plantilla));
      
      console.log('✅ Plantillas públicas cargadas:', this.plantillasPublicas.length);
    } catch (error) {
      console.error('❌ Error cargando plantillas públicas:', error);
      this.mostrarError('Error al cargar las plantillas públicas');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Cargar plantillas privadas
   */
   async cargarPlantillasPrivadas(): Promise<void> {
    try {
      this.cargando = true;
      
      // 🆕 CARGAR VECES USADA
      await this.cargarVecesUsadaPlantillas();
      
      const plantillasRaw = await lastValueFrom(
        this.templateListService.getMisPlantillas()
      );
      
      // 🔧 FILTRAR solo las plantillas privadas
      const plantillasPrivadasRaw = plantillasRaw.filter(p => !p.esPublica);
      this.plantillasPrivadas = plantillasPrivadasRaw.map(plantilla => this.normalizarPlantilla(plantilla));
      
      console.log('✅ Plantillas privadas cargadas:', this.plantillasPrivadas.length);
    } catch (error) {
      console.error('❌ Error cargando plantillas privadas:', error);
      this.mostrarError('Error al cargar las plantillas privadas');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Cargar todas las plantillas (solo admin)
   */
  async cargarTodasPlantillas(): Promise<void> {
  if (!this.esAdmin) {
    this.mostrarError('No tienes permisos para ver todas las plantillas');
    return;
  }

  try {
    this.cargando = true;
    
    // 🆕 CARGAR PRIMERO LAS VECES USADA
    await this.cargarVecesUsadaPlantillas();
    
    // Cargar y normalizar plantillas
    const plantillasRaw = await lastValueFrom(
      this.templateListService.getTodasPlantillas()
    );
    
    // 🔧 NORMALIZAR todas las plantillas
    this.todasPlantillas = plantillasRaw.map(plantilla => this.normalizarPlantilla(plantilla));
    
    console.log('✅ Todas las plantillas cargadas:', this.todasPlantillas.length);
  } catch (error) {
    console.error('❌ Error cargando todas las plantillas:', error);
    this.mostrarError('Error al cargar todas las plantillas');
  } finally {
    this.cargando = false;
  }
}

  /**
   * Cambiar vista entre mis plantillas, públicas, privadas y todas (admin)
   */
  cambiarVista(vista: 'mis-plantillas' | 'publicas' | 'privadas' | 'todas'): void {
    this.vista = vista;
    this.filtro = '';
    
    switch (vista) {
      case 'mis-plantillas':
        this.cargarMisPlantillas();
        break;
      case 'publicas':
        this.cargarPlantillasPublicas();
        break;
      case 'privadas':
        this.cargarPlantillasPrivadas();
        break;
      case 'todas':
        this.cargarTodasPlantillas();
        break;
    }
  }

  /**
   * Filtrar plantillas
   */
  get plantillasFiltradas(): TemplateListItem[] {
    let lista: TemplateListItem[];
    
    switch (this.vista) {
      case 'mis-plantillas':
        lista = this.misPlantillas;
        break;
      case 'publicas':
        lista = this.plantillasPublicas;
        break;
      case 'privadas':
        lista = this.plantillasPrivadas;
        break;
      case 'todas':
        lista = this.todasPlantillas;
        break;
      default:
        lista = [];
    }
    
    if (!this.filtro.trim()) {
      return lista;
    }

    const filtroLower = this.filtro.toLowerCase();
    return lista.filter(plantilla =>
      plantilla.nombre.toLowerCase().includes(filtroLower) ||
      (plantilla.descripcion && plantilla.descripcion.toLowerCase().includes(filtroLower)) ||
      (plantilla.categoria && plantilla.categoria.nombre.toLowerCase().includes(filtroLower))
    );
  }

  /**
   * Editar plantilla
   */
  editarPlantilla(plantilla: TemplateListItem): void {
     try {
      console.log('🔄 Abriendo proyecto:', plantilla.id);
      this.navegarAdmin(plantilla.id!);
    } catch (error) {
      console.error('❌ Error abriendo proyecto:', error);
      alert('Error al abrir el proyecto');
    }
  }
  private navegarAdmin(plantillaId: number): void {
   
    this.router.navigate(['/admin/design'], { queryParams: { proyecto: plantillaId} });
  }

  /**
   * Eliminar plantilla
   */
  async eliminarPlantilla(plantilla: TemplateListItem): Promise<void> {
    if (!confirm(`¿Estás seguro de eliminar la plantilla "${plantilla.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await lastValueFrom(
        this.templateListService.eliminarPlantilla(plantilla.id)
      );
      
      console.log('🗑️ Plantilla eliminada:', plantilla.nombre);
      this.mostrarExito('Plantilla eliminada correctamente');
      
      // Recargar la lista actual
      this.recargarListaActual();
      
    } catch (error) {
      console.error('❌ Error eliminando plantilla:', error);
      this.mostrarError('Error al eliminar la plantilla');
    }
  }

  /**
   * Duplicar plantilla
   */
  async duplicarPlantilla(plantilla: TemplateListItem): Promise<void> {
    try {
      const plantillaDuplicada = await lastValueFrom(
        this.templateListService.duplicarPlantilla(plantilla.id)
      );
      
      console.log('✅ Plantilla duplicada:', plantillaDuplicada);
      this.mostrarExito('Plantilla duplicada correctamente');
      
      // Recargar la lista actual
      this.recargarListaActual();
      
    } catch (error) {
      console.error('❌ Error duplicando plantilla:', error);
      this.mostrarError('Error al duplicar la plantilla');
    }
  }

  /**
   * Cambiar visibilidad de plantilla
   */
  async cambiarVisibilidad(plantilla: TemplateListItem): Promise<void> {
    const nuevaVisibilidad = !plantilla.esPublica;
    const accion = nuevaVisibilidad ? 'publicar' : 'ocultar';
    
    if (!confirm(`¿${nuevaVisibilidad ? 'Publicar' : 'Ocultar'} la plantilla "${plantilla.nombre}"?`)) {
      return;
    }

    try {
      await lastValueFrom(
        this.templateListService.cambiarVisibilidad(plantilla.id, nuevaVisibilidad)
      );
      
      console.log(`✅ Plantilla ${accion}da:`, plantilla.nombre);
      this.mostrarExito(`Plantilla ${accion}da correctamente`);
      
      // Actualizar estado local
      plantilla.esPublica = nuevaVisibilidad;
      
    } catch (error) {
      console.error(`❌ Error ${accion}do plantilla:`, error);
      this.mostrarError(`Error al ${accion} la plantilla`);
    }
  }

  /**
   * Ver detalles de plantilla
   */
  verDetalles(plantilla: TemplateListItem): void {
    this.plantillaSeleccionada = plantilla;
    console.log('🔍 Detalles de plantilla:', plantilla);
  }

  /**
   * Cerrar detalles
   */
  cerrarDetalles(): void {
    this.plantillaSeleccionada = null;
  }

  /**
   * Recargar lista actual
   */
  private recargarListaActual(): void {
    switch (this.vista) {
      case 'mis-plantillas':
        this.cargarMisPlantillas();
        break;
      case 'publicas':
        this.cargarPlantillasPublicas();
        break;
      case 'privadas':
        this.cargarPlantillasPrivadas();
        break;
      case 'todas':
        this.cargarTodasPlantillas();
        break;
    }
  }

  /**
   * Mostrar mensaje de éxito
   */
  private mostrarExito(mensaje: string): void {
    // Puedes usar un servicio de notificaciones o toast
    alert(`✅ ${mensaje}`);
  }

  /**
   * Mostrar mensaje de error
   */
  private mostrarError(mensaje: string): void {
    alert(`❌ ${mensaje}`);
  }

  /**
   * Obtener icono según categoría
   */
  getIconoCategoria(categoria: any): string {
    if (!categoria) return 'fas fa-shapes';
    
    const nombreCategoria = typeof categoria === 'string' ? categoria : categoria.nombre;
    
    const iconos: { [key: string]: string } = {
      'educativa': 'fas fa-graduation-cap',
      'empresarial': 'fas fa-briefcase',
      'personal': 'fas fa-user',
      'historica': 'fas fa-landmark',
      'cientifica': 'fas fa-flask',
      'cultural': 'fas fa-theater-masks',
      'tecnologica': 'fas fa-microchip',
      'default': 'fas fa-shapes'
    };
    
    const icono = iconos[nombreCategoria.toLowerCase()];
  return icono || iconos['default'];
  }

  /**
   * Obtener clase de badge según categoría
   */
  getClaseCategoria(categoria: any): string {
    if (!categoria) return 'badge bg-secondary';
    
    const nombreCategoria = typeof categoria === 'string' ? categoria : categoria.nombre;
    
    const clases: { [key: string]: string } = {
      'educativa': 'badge bg-primary',
      'empresarial': 'badge bg-success',
      'personal': 'badge bg-info',
      'historica': 'badge bg-warning',
      'cientifica': 'badge bg-purple',
      'cultural': 'badge bg-pink',
      'tecnologica': 'badge bg-cyan',
      'default': 'badge bg-secondary'
    };
    
    const categoriaKey = nombreCategoria.toLowerCase();
  return clases[categoriaKey] || clases['default'];
  }

  /**
   * Obtener nombre de categoría
   */
  getNombreCategoria(categoria: any): string {
    if (!categoria) return 'Sin categoría';
    return typeof categoria === 'string' ? categoria : categoria.nombre;
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date | string | undefined | null): string {
  if (!fecha) return 'N/A';
  
  try {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    
    // Validar que sea una fecha válida
    if (isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return fechaObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'N/A';
  }
}

  /**
   * Obtener texto de uso
   */
   getTextoUso(plantilla: TemplateListItem): string {
    const vecesUsada = this.getVecesUsada(plantilla);
    
    if (vecesUsada === 0) return 'Nunca usada';
    if (vecesUsada === 1) return '1 vez usada';
    return `${vecesUsada} veces usada`;
  }

  /**
   * Manejador de errores de imagen
   */
  onImageError(event: any): void {
    const img = event.target;
   // img.src = 'assets/images/placeholder-template.png';
    img.alt = 'Imagen no disponible';
  }

  /**
   * Obtener URL de la imagen (thumbnail o portada)
   */
   getImagenPlantilla(plantilla: TemplateListItem): string {
  // Si ya tiene portadaUrl completa
  if (plantilla.metadatos?.portadaUrl) {
    return plantilla.metadatos.portadaUrl;
  }
  
  // Si tiene thumbnail completo
  if (plantilla.metadatos?.thumbnail) {
    return plantilla.metadatos.thumbnail;
  }
  
  // Si tiene un nombre de archivo de portada, construir la URL
  if (plantilla.metadatos?.portada && plantilla.creadoPorId) {
    return this.archivoService.obtenerUrlPortadaPlantillaAdmin(
      plantilla.creadoPorId,  // ✅ Usa el ID del creador de la plantilla
      plantilla.id,
      plantilla.metadatos.portada
    );
  }
  
  // Imagen por defecto
  return 'assets/images/placeholder-template.png';
}


  obtenerUrlPortadaPlantilla(plantillaId: number, nombreArchivo: string): string {
  const usuarioActual = this.authService.getCurrentUser();
  if (!usuarioActual || !usuarioActual.id) {
    return 'assets/images/placeholder-template.png';
  }

  try {
    return this.archivoService.obtenerUrlPortadaPlantillaAdmin(
      usuarioActual.id,
      plantillaId,
      nombreArchivo
    );
  } catch (error) {
    console.error('Error obteniendo URL de portada:', error);
    return 'assets/images/placeholder-template.png';
  }
}


}