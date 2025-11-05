import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, lastValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthService } from './auth.service';


export interface ProyectoTemporal {
  titulo: string;
  descripcion: string;
  plantillaId?: number;
  plantillaData?: any; // ← Datos completos de la plantilla seleccionada
}


// Interfaces para la estructura de data
export interface EventoData {
  year: number;
  title: string;
  person: string;
  description: string;
  image?:string;

  
  orden?: number; //Orden original del evento
  posicionLibre?: { // Posición personalizada
    x: number;
    y: number;
  };
  
}

export interface ElementoKonva {
  tipo: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  draggable: boolean;
  hijos: any[];
  clip: any;
}

export interface EstilosTimeline {
  backgroundColor: string;
  timelineColor: string;
  eventColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  titleFontSize: number;
  yearFontSize: number;
  imageStyle: string;
  imageSize: number;
  imageBorder: boolean;
  shadows: boolean;
  animations: boolean;
  connectorStyle: string;
}

export interface MetadataProyecto {
  nombre: string;
  descripcion: string;
  fechaExportacion: string;
  version: string;
  totalEventos: number;
  portadaUrl?: string;
}

export interface ConfiguracionTimeline {
  backgroundColor: string;
  minYear: number;
  maxYear: number;
  stageWidth: number;
  stageHeight: number;
  lineaDeTiempo?: LineaDeTiempoConfig;
}


export interface LineaDeTiempoConfig {
  tipo: 'horizontal' | 'vertical' | 'curve' | 'wave' | 'zigzag' | 'spiral' | 's-curve' | 'custom';
  designId: string;
  positionX?: number;
  positionY?: number;
  amplitude?: number;
  frequency?: number;
  intensity?: number;
  intensitycurva?: number;
  anchoTotal?: number;
  turns?: number;
  estilo?: {
    stroke: string;
    strokeWidth: number;
    lineCap: string;
  };
}
export interface ProyectoData {
  metadata: MetadataProyecto;
  configuracion: ConfiguracionTimeline;
  eventos: EventoData[];
  elementosKonva: ElementoKonva[];
  estilos: EstilosTimeline;
}



// Interfaces principales del servicio
export interface Proyecto {
  id?: number;
  titulo: string;
  descripcion: string;
  data: string; // Contiene el JSON stringificado de ProyectoData
  usuarioId?: number;
  usuarioNombre?: string;
  plantillaBaseId?: number;
  plantillaBaseNombre?: string;
  fechaCreacion?: Date;
  fechaModificacion?: Date;
}

export interface ProyectoRequest {
  titulo: string;
  descripcion: string;
  data: string; // JSON stringificado de ProyectoData
  plantillaBaseId?:  number | null; 
}

export interface ProyectoResponseDTO {
  id: number;
  titulo: string;
  descripcion: string;
  data: string;
  usuarioId: number;
  usuarioNombre: string;
  plantillaBaseId?: number;
  plantillaBaseNombre?: string;
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface EstadisticasUsuario {
  totalProyectos: number;
  proyectosRecientes: number;
  ultimosProyectos: ProyectoResponseDTO[];
}

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private apiUrl = `${environment.apiUrl}/proyectos`;
  private proyectoTemporal = new BehaviorSubject<ProyectoTemporal | null>(null);
  public proyectoTemporal$ = this.proyectoTemporal.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // === MÉTODOS BÁSICOS CRUD ===

  setProyectoTemporal(proyecto: ProyectoTemporal): void {
  this.proyectoTemporal.next(proyecto);
 
}

  getProyectoTemporal(): ProyectoTemporal | null {
  return this.proyectoTemporal.value;
}

  clearProyectoTemporal(): void {
    this.proyectoTemporal.next(null);
  }

  // GET /api/proyectos - Obtener todos los proyectos del usuario
  getProyectosByUsuario(): Observable<ProyectoResponseDTO[]> {
    return this.http.get<ProyectoResponseDTO[]>(this.apiUrl);
  }

  // GET /api/proyectos/recientes - Obtener proyectos recientes
  getProyectosRecientes(): Observable<ProyectoResponseDTO[]> {
    return this.http.get<ProyectoResponseDTO[]>(`${this.apiUrl}/recientes`);
  }

  // GET /api/proyectos/{id} - Obtener proyecto por ID
  getProyectoById(id: number): Observable<ProyectoResponseDTO> {
    return this.http.get<ProyectoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  // POST /api/proyectos - Crear nuevo proyecto
  createProyecto(proyecto: ProyectoRequest): Observable<ProyectoResponseDTO> {
    const proyectoParaEnviar = {
      ...proyecto,
      data: this.ensureStringData(proyecto.data)
    };

    return this.http.post<ProyectoResponseDTO>(this.apiUrl, proyectoParaEnviar);
  }

  // PUT /api/proyectos/{id} - Actualizar proyecto completo
  updateProyecto(id: number, proyecto: ProyectoRequest): Observable<ProyectoResponseDTO> {
  const proyectoParaEnviar = {
    ...proyecto,
    data: this.ensureStringData(proyecto.data)
  };

  console.log('Actualizando proyecto:', {
    id,
    url: `${this.apiUrl}/${id}`,
    titulo: proyectoParaEnviar.titulo,
    descripcion: proyectoParaEnviar.descripcion,
    plantillaBaseId: proyectoParaEnviar.plantillaBaseId,
    dataLength: proyectoParaEnviar.data.length
  });

  return this.http.put<ProyectoResponseDTO>(`${this.apiUrl}/${id}`, proyectoParaEnviar);
}

  // PATCH /api/proyectos/{id}/data - Actualizar solo los datos
  updateProyectoData(id: number, data: ProyectoData): Observable<{message: string}> {
    const dataString = this.serializarData(data);
    return this.http.patch<{message: string}>(
      `${this.apiUrl}/${id}/data`, 
      { data: dataString }
    );
  }

  // DELETE /api/proyectos/{id} - Eliminar proyecto
  deleteProyecto(id: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}`);
  }

  // GET /api/proyectos/buscar?titulo=xxx - Buscar proyectos por título
  buscarProyectos(titulo: string): Observable<ProyectoResponseDTO[]> {
    const params = new HttpParams().set('titulo', titulo);
    return this.http.get<ProyectoResponseDTO[]>(`${this.apiUrl}/buscar`, { params });
  }

  // POST /api/proyectos/{id}/duplicar - Duplicar proyecto
  duplicarProyecto(id: number): Observable<ProyectoResponseDTO> {
    return this.http.post<ProyectoResponseDTO>(`${this.apiUrl}/${id}/duplicar`, {});
  }

  // GET /api/proyectos/estadisticas - Estadísticas del usuario
  getEstadisticas(): Observable<EstadisticasUsuario> {
    return this.http.get<EstadisticasUsuario>(`${this.apiUrl}/estadisticas`);
  }

  // GET /api/proyectos/{id}/permisos - Verificar permisos
  verificarPermisos(id: number): Observable<{tienePermisos: boolean}> {
    return this.http.get<{tienePermisos: boolean}>(`${this.apiUrl}/${id}/permisos`);
  }

  // === MÉTODOS UTILITARIOS ESPECÍFICOS PARA TIMELINE ===

  // Crear estructura de data inicial para un nuevo proyecto
  crearEstructuraDataInicial(titulo: string, descripcion: string): ProyectoData {
    const ahora = new Date().toISOString();
    
    return {
      metadata: {
        nombre: titulo,
        descripcion: descripcion,
        fechaExportacion: ahora,
        version: "1.0",
        totalEventos: 0
      },
      configuracion: {
        backgroundColor: "#f9f9f9",
        minYear: new Date().getFullYear() - 10,
        maxYear: new Date().getFullYear() + 10,
        stageWidth: 1020,
        stageHeight: 690
      },
      eventos: [],
      elementosKonva: [],
      estilos: {
        backgroundColor: "#f9f9f9",
        timelineColor: "#070707ff",
        eventColor: "#3498db",
        textColor: "#2c3e50",
        accentColor: "#e74c3c",
        fontFamily: "Arial",
        titleFontSize: 14,
        yearFontSize: 12,
        imageStyle: "circle",
        imageSize: 90,
        imageBorder: true,
        shadows: true,
        animations: true,
        connectorStyle: "dashed"
      }
    };
  }



  limpiarDataParaServidor(proyectoData: ProyectoData): ProyectoData {
  //console.log('🧹 Limpiando datos para servidor...');
  
  return {
    ...proyectoData,
    metadata: {
      ...proyectoData.metadata,
      nombre: proyectoData.metadata.nombre || '',
      descripcion: proyectoData.metadata.descripcion || '', // ✅ CORREGIDO
      fechaExportacion: proyectoData.metadata.fechaExportacion,
      version: proyectoData.metadata.version || '1.0',
      totalEventos: proyectoData.metadata.totalEventos || 0,
      portadaUrl: proyectoData.metadata.portadaUrl || ''
    },
    eventos: proyectoData.eventos.map(evento => ({
      ...evento,
      // ✅ Reemplazar data URLs largas por marcadores temporales
      image: this.procesarImagenParaServidor(evento.image)
    })),
    elementosKonva: this.limpiarElementosKonva(proyectoData.elementosKonva)
  };
}

/**
 * Procesa imágenes para el servidor - evita data URLs largas
 */
private procesarImagenParaServidor(image: string | undefined): string {
  if (!image) return '';
  
  // ✅ Si es una URL del servidor, mantenerla
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  
  // ✅ Si es data URL y es muy larga, usar marcador temporal
  if (image.startsWith('data:image') && image.length > 5000) {
    //console.log('📝 Reemplazando data URL larga por marcador temporal');
    return 'TEMPORAL_DATA_URL'; // Marcador que luego reemplazaremos
  }
  
  // ✅ Si es data URL corta (placeholder), mantenerla
  return image;
}

/**
 * Limpia elementos Konva para evitar data URLs largas
 */
private limpiarElementosKonva(elementos: any[]): any[] {
  if (!elementos || !Array.isArray(elementos)) return [];
  
  return elementos.map(elemento => {
    if (elemento.tipo === 'Image' && elemento.imageData) {
      // ✅ No enviar data URLs largas en elementos Konva
      return {
        ...elemento,
        imageData: elemento.imageData.startsWith('data:image') && elemento.imageData.length > 5000 
          ? 'TEMPORAL_IMAGE_DATA' 
          : elemento.imageData
      };
    }
    return elemento;
  });
}

/**
 * Serializa data con validación y limpieza
 */
serializarData(data: ProyectoData): string {
  try {
    // ✅ PRIMERO: Limpiar los datos
    const dataLimpia = this.limpiarDataParaServidor(data);
    
    // ✅ SEGUNDO: Validar estructura crítica
    this.validarEstructuraData(dataLimpia);
    
    // ✅ TERCERO: Serializar
    const jsonString = JSON.stringify(dataLimpia, null, 2);
    
    // ✅ CUARTO: Validar que el JSON sea parseable
    JSON.parse(jsonString);
    
    //console.log('✅ JSON válido, tamaño:', jsonString.length, 'caracteres');
    return jsonString;
    
  } catch (error) {
    console.error('Error serializando datos:', error);
    
    // ✅ FALLBACK: Enviar estructura mínima en caso de error
    const dataMinima = this.crearEstructuraDataMinima(data);
    return JSON.stringify(dataMinima);
  }
}

/**
 * Valida la estructura crítica de los datos
 */
private validarEstructuraData(data: ProyectoData): void {
  const errores: string[] = [];

  if (!data.metadata) {
    errores.push('Falta metadata');
  } else {
    if (!data.metadata.nombre) errores.push('Falta metadata.nombre');
    if (!data.metadata.descripcion) errores.push('Falta metadata.descripcion'); // ✅ CORREGIDO
  }

  if (!data.configuracion) {
    errores.push('Falta configuracion');
  }

  if (!Array.isArray(data.eventos)) {
    errores.push('eventos no es un array');
  }

  if (!Array.isArray(data.elementosKonva)) {
    errores.push('elementosKonva no es un array');
  }

  if (errores.length > 0) {
    throw new Error(`Estructura de datos inválida: ${errores.join(', ')}`);
  }
}

/**
 * Crea estructura mínima como fallback
 */
private crearEstructuraDataMinima(dataOriginal: ProyectoData): ProyectoData {
  return {
    metadata: {
      nombre: dataOriginal.metadata?.nombre || 'Proyecto sin nombre',
      descripcion: dataOriginal.metadata?.descripcion || 'Descripción no disponible',
      fechaExportacion: new Date().toISOString(),
      version: '1.0',
      totalEventos: dataOriginal.eventos?.length || 0,
      portadaUrl: dataOriginal.metadata?.portadaUrl || ''
    },
    configuracion: dataOriginal.configuracion || {
      backgroundColor: "#f9f9f9",
      minYear: 1800,
      maxYear: 2000,
      stageWidth: 1020,
      stageHeight: 690
    },
    eventos: dataOriginal.eventos?.map(evento => ({
      year: evento.year,
      title: evento.title,
      person: evento.person,
      description: evento.description,
      image: '' // ✅ Limpiar imágenes en fallback
    })) || [],
    elementosKonva: [],
    estilos: dataOriginal.estilos || {
      backgroundColor: "#f9f9f9",
      timelineColor: "#070707ff",
      eventColor: "#3498db",
      textColor: "#2c3e50",
      accentColor: "#e74c3c",
      fontFamily: "Arial",
      titleFontSize: 14,
      yearFontSize: 12,
      imageStyle: "circle",
      imageSize: 90,
      imageBorder: true,
      shadows: true,
      animations: true,
      connectorStyle: "dashed"
    }
  };
}

actualizarMetadatos(titulo: string, descripcion: string): void {
  const actual = this.proyectoTemporal.value;
  if (actual) {
    this.proyectoTemporal.next({
      ...actual,
      titulo,
      descripcion
    });
  }
}

tienePlantillaCargada(): boolean {
  const actual = this.proyectoTemporal.value;
  return !!(actual && actual.plantillaData);
}

  // Parsear string JSON a objeto ProyectoData
  parsearData(dataString: string): ProyectoData {
    try {
      const parsed = JSON.parse(dataString || '{}');
      
      // Asegurar que tenga la estructura completa
      return {
        metadata: parsed.metadata || {
          nombre: '',
          descripcion: '',
          fechaExportacion: new Date().toISOString(),
          version: '1.0',
          totalEventos: 0
        },
        configuracion: parsed.configuracion || {
          backgroundColor: "#f9f9f9",
          minYear: new Date().getFullYear() - 10,
          maxYear: new Date().getFullYear() + 10,
          stageWidth: 1020,
          stageHeight: 690
        },
        eventos: parsed.eventos || [],
        elementosKonva: parsed.elementosKonva || [],
        estilos: parsed.estilos || {
          backgroundColor: "#f9f9f9",
          timelineColor: "#070707ff",
          eventColor: "#3498db",
          textColor: "#2c3e50",
          accentColor: "#e74c3c",
          fontFamily: "Arial",
          titleFontSize: 14,
          yearFontSize: 12,
          imageStyle: "circle",
          imageSize: 90,
          imageBorder: true,
          shadows: true,
          animations: true,
          connectorStyle: "dashed"
        }
      };
    } catch {
      // Si hay error de parseo, devolver estructura por defecto
      return this.crearEstructuraDataInicial('', '');
    }
  }

  // Método helper para crear un proyecto completo fácilmente
  crearProyectoCompleto(
    titulo: string, 
    descripcion: string, 
    plantillaBaseId?: number,
    dataPersonalizada?: Partial<ProyectoData>
  ): ProyectoRequest {
    
    const data = dataPersonalizada 
      ? { ...this.crearEstructuraDataInicial(titulo, descripcion), ...dataPersonalizada }
      : this.crearEstructuraDataInicial(titulo, descripcion);

    return {
      titulo,
      descripcion,
      data: this.serializarData(data),
      plantillaBaseId
    };
  }

  private ensureStringData(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data || {});
  }
}