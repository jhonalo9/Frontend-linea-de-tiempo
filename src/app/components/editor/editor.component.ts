import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Konva from 'konva';
import { TemplateLayout, TemplateService, TimelineTemplate } from '../../core/services/template.service';
import { PlantillaDesignService } from '../../core/services/plantilla-design.service';
import { ProyectoData, ProyectoRequest, ProyectoService } from '../../core/services/proyecto.service';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ArchivoService } from '../../core/services/archivo.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router'; 
import { EventDesign, EventElement, EventStyles } from '../../core/models/event-design.interface';
import { EventDesignService } from '../../core/services/event-design.service';
import { MarkerStyle, TimelineDesign, TimelineLayout } from '../../core/models/timeline-design.interface';
import { TimelineDesignService } from '../../core/services/timeline-design.service';

// Agregar esta interfaz si no existe
export interface TemplateStyles {
  // Colores principales
  backgroundColor: string;
  timelineColor: string;
  eventColor: string;
  textColor: string;
  accentColor: string;
  
  // Tipografía
  fontFamily: string;
  titleFontSize: number;
  yearFontSize: number;
  
  // Estilo de imágenes
  imageStyle: 'circle' | 'square' | 'rounded';
  imageSize: number;
  imageBorder: boolean;
  
  // Efectos
  shadows: boolean;
  animations: boolean;
  connectorStyle: 'solid' | 'dashed' | 'dotted';
}

interface TimelineEvent {
  year: number;
  title: string;
  person: string;
  description: string;
  image?: string ;
  link?: string;
  zonaDesign?: any;
  orden?:any
}



export interface ProyectoExport {
  metadata: {
    nombre: string;
    descripcion: string;
    fechaExportacion: string;
    version: string;
    totalEventos: number;
  };
  configuracion: {
    backgroundColor: string;
    minYear: number;
    maxYear: number;
    stageWidth: number;
    stageHeight: number;
  };
  eventos: TimelineEvent[];
  elementosKonva: any[];
  estilos: any;
}

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
  imports: [CommonModule, FormsModule,RouterModule]
})
export class EditorComponent implements OnInit {
  @ViewChild('container', { static: true }) container!: ElementRef;




  public timelineDesigns: TimelineDesign[] = [];
  public currentTimelineDesign: TimelineDesign;
  public selectedTimelineDesignId: string = 'classic-line';


  showDesignTemplatesModal = false;
  plantillasDisponibles: any[] = [];
  
  // Propiedades de Konva
  stage!: Konva.Stage;
  backgroundLayer!: Konva.Layer;
  mainLayer!: Konva.Layer;


  // Nueva propiedad para la portada del proyecto
  proyectoPortada: string = '';
  portadaArchivo: File | null = null;
  showPortadaModal: boolean = false;
  
  // Propiedades del editor
  backgroundColor: string = '#ffffffff';
  showEventModal: boolean = false;
  showEditModal: boolean = false;
  autoUpdateYears: boolean = false;

showSaveProjectModal: boolean = false;
  proyectoGuardado: boolean = false;
  proyectoNombre: string = 'Mi Proyecto';
  proyectoDescripcion: string = '';


   misProyectos: any[] = [];
  cargandoProyectos: boolean = false;
  proyectoActualId?: number;



  isEditingTitle: boolean = false;
  isEditingDescription: boolean = false;
  proyectoTitleElement: Konva.Text | null = null;
  proyectoDescriptionElement: Konva.Text | null = null;



  
  // Eventos
  selectedEvent: TimelineEvent | null = null;
  editedEvent: TimelineEvent = {
    year: 0,
    title: '',
    person: '',
    description: '',
    image: '',
    link: ''
  };
  
  timelineEvents: TimelineEvent[] = [];
  
  newEvent: TimelineEvent = {
    year: 0,
    title: '',
    person: '',
    description: '',
    image: '',
    link: ''
  };

  



  
// Propiedades de Zoom
public zoomLevel: number = 100; // Zoom actual en porcentaje
public minZoom: number = 25;    // Zoom mínimo
public maxZoom: number = 400;   // Zoom máximo
public zoomStep: number = 5;   // Incremento/decremento del zoom

  

// Propiedades de dimensiones del canvas
public canvasWidth: number = 1200;
public canvasHeight: number = 800;
public isResizing: boolean = false;
public resizeHandle: string = ''; // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
public originalMouseX: number = 0;
public originalMouseY: number = 0;
public originalCanvasWidth: number = 0;
public originalCanvasHeight: number = 0;

  containerSize: number = 70;
 isPresentacionMode: boolean = false;


  onContainerSizeChange(): void {
    if (this.isPresentacionMode) return;
    
    setTimeout(() => {
      if (this.stage) {
        this.stage.batchDraw();
      }
    }, 50);
  }


  /*ngOnDestroy(): void {
    if (this.isPresentacionMode) {
      document.removeEventListener('keydown', this.handleEscapeKey);
      document.body.classList.remove('presentacion-mode');
      document.body.style.overflow = '';
    }
  }*/

    ngOnDestroy(): void {
  if (this.isPresentacionMode) {
    this.exitFullscreen();
  }
  
  document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
  document.removeEventListener('msfullscreenchange', this.handleFullscreenChange);
}
resetContainerSize(): void {
  this.containerSize = 90;
  this.onContainerSizeChange();
}

togglePresentacion(): void {
  if (!this.isPresentacionMode) {
    this.enterFullscreen();
  } else {
    this.exitFullscreen();
  }
}

private enterFullscreen(): void {
  const container = document.getElementById('konva-container');
  
  if (!container) {
    console.error('Container no encontrado');
    return;
  }

  // Intentar entrar en pantalla completa
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if ((container as any).webkitRequestFullscreen) { // Safari
    (container as any).webkitRequestFullscreen();
  } else if ((container as any).msRequestFullscreen) { // IE11
    (container as any).msRequestFullscreen();
  } else if ((container as any).mozRequestFullScreen) { // Firefox
    (container as any).mozRequestFullScreen();
  }

  // Actualizar estado
  this.isPresentacionMode = true;
  
  // Ajustar el stage después de entrar en fullscreen
  setTimeout(() => {
    this.adjustStageToFullscreen();
  }, 100);

  // Escuchar cuando se sale del fullscreen (ESC o F11)
  document.addEventListener('fullscreenchange', this.handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
  document.addEventListener('msfullscreenchange', this.handleFullscreenChange);
}

private exitFullscreen(): void {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if ((document as any).webkitExitFullscreen) { // Safari
    (document as any).webkitExitFullscreen();
  } else if ((document as any).msExitFullscreen) { // IE11
    (document as any).msExitFullscreen();
  } else if ((document as any).mozCancelFullScreen) { // Firefox
    (document as any).mozCancelFullScreen();
  }

  this.isPresentacionMode = false;
  
  // Restaurar tamaño original
  setTimeout(() => {
    this.restoreOriginalSize();
  }, 100);
}

private handleFullscreenChange = () => {
  const isFullscreen = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );

  if (!isFullscreen && this.isPresentacionMode) {
    // El usuario salió con ESC
    this.isPresentacionMode = false;
    this.restoreOriginalSize();
    
    // Remover event listeners
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('msfullscreenchange', this.handleFullscreenChange);
  }
}

private adjustStageToFullscreen(): void {
  if (!this.stage) return;

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  // Calcular escala para ajustar el contenido
  const scaleX = screenWidth / this.canvasWidth;
  const scaleY = screenHeight / this.canvasHeight;
  const scale = Math.min(scaleX, scaleY) * 0.95; // 95% para dejar margen

  // Aplicar escala y centrar
  this.stage.scale({ x: scale, y: scale });
  
  const offsetX = (screenWidth - this.canvasWidth * scale) / 2;
  const offsetY = (screenHeight - this.canvasHeight * scale) / 2;
  
  this.stage.position({ x: offsetX, y: offsetY });
  
  // Ajustar el contenedor
  this.stage.width(screenWidth);
  this.stage.height(screenHeight);
  
  this.stage.batchDraw();
  
}


private restoreOriginalSize(): void {
  if (!this.stage) return;

  // Restaurar escala y posición original
  this.stage.scale({ x: 1, y: 1 });
  this.stage.position({ x: 0, y: 0 });
  this.stage.width(this.canvasWidth);
  this.stage.height(this.canvasHeight);
  
  this.stage.batchDraw();
  
}



public eventDesigns: EventDesign[] = [];

  // Configuración
  minYear: number = 1800;
  maxYear: number = 2000;

  backgroundColors: string[] = [
    '#ffffff','#f9f9f9', '#f0f8ff', '#fffaf0', '#f5f5f5',
    '#e6f3ff', '#f0fff0', '#fff0f5', '#f8f8ff', '#fafad2'
  ];
currentEventDesign!: EventDesign;
  constructor(private templateService: TemplateService,
    private route: ActivatedRoute,
    private plantillaDesignService: PlantillaDesignService,
    private router: Router   ,
    private proyectoService: ProyectoService,
    private authService: AuthService,
    private archivoService: ArchivoService,
    private eventDesignService: EventDesignService,
    private timelineDesignService: TimelineDesignService
   ) { this.currentEventDesign = this.eventDesignService.getEventDesignById('default-with-image')!;
       const defaultDesign = this.timelineDesignService.getTimelineDesignById(this.selectedTimelineDesignId);
    if (defaultDesign) {
      this.currentTimelineDesign = defaultDesign;
    } else {
      // Fallback seguro
      this.currentTimelineDesign = this.getDefaultTimelineDesign();
    }
   }

   private getDefaultTimelineDesign(): TimelineDesign {
  return {
    id: 'default-timeline',
    name: 'Línea por Defecto',
    description: 'Diseño básico de línea de tiempo',
    layout: {
      type: 'horizontal',
      orientation: 'center'
    },
    lineStyle: {
      stroke: '#070707ff',
      strokeWidth: 5,
      strokeStyle: 'solid',
      lineCap: 'round',
      shadow: {
        color: 'rgba(0,0,0,0.3)',
        blur: 8,
        offset: { x: 0, y: 3 },
        opacity: 0.5
      }
    },
    markers: [
      {
        type: 'year',
        position: 'both',
        interval: 10,
        style: {
          size: 4,
          color: '#070707ff',
          shape: 'line',
          label: {
            show: true,
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#2c3e50',
            position: 'outside'
          }
        }
      }
    ]
  };
}



 

  ngOnInit(): void {
    this.timelineDesigns = this.timelineDesignService.getTimelineDesigns();
    this.eventDesigns = this.eventDesignService.getEventDesigns();

    this.initKonva();
    this.calculateYearRange();
    this.renderTimelineEvents();
    this.cargarPlantillasDiseno();
    this.crearElementosProyecto()

    this.setupCanvasResize();
    
  this.setupMouseWheelZoom();

  this.cargarPlantillaDesdeServicio();

    this.route.queryParams.subscribe(params => {
    const proyectoId = params['proyecto'];
    
    if (proyectoId) {
      const id = Number(proyectoId);
      
      if (id && id > 0) {
        this.cargarProyecto(id);
      } else {
        console.error('ID de proyecto inválido en URL:', proyectoId);
        alert('ID de proyecto inválido');
      }
    } else {
      console.log('No hay proyecto en URL - modo nuevo proyecto');
      // Aquí puedes inicializar un proyecto nuevo si es necesario
    }
  });
    
  }


  private cargarPlantillaDesdeServicio(): void {
  const proyectoTemporal = this.proyectoService.getProyectoTemporal();
  
  if (!proyectoTemporal) {
    console.log('ℹ️ No hay datos temporales');
    return;
  }


  // Establecer título y descripción
  this.proyectoNombre = proyectoTemporal.titulo || 'Mi Proyecto';
  this.proyectoDescripcion = proyectoTemporal.descripcion || 'Descripción del proyecto';

  // Actualizar elementos de texto en el canvas
  this.crearElementosProyecto();

  // Cargar plantilla si existe
  if (proyectoTemporal.plantillaData) {
    
    // ✅ DEBUG: Mostrar estructura completa de data
   /* if (proyectoTemporal.plantillaData.data) {
      console.log('📊 Estructura de data:', {
        tieneLineaDeTiempo: !!proyectoTemporal.plantillaData.data.lineaDeTiempo,
        tieneZonasEventos: !!proyectoTemporal.plantillaData.data.zonasEventos,
        tieneElementosDecorativos: !!proyectoTemporal.plantillaData.data.elementosDecorativos,
        dataCompleta: proyectoTemporal.plantillaData.data
      });
    }*/
    
    this.aplicarPlantillaCompleta(proyectoTemporal.plantillaData);
  } else {
    console.log(' No hay plantilla para aplicar');
  }
}


private aplicarPlantillaCompleta(plantillaData: any): void {
  try {

    //VALIDAR DATA EXISTA
    if (!plantillaData.data) {
      throw new Error('plantillaData.data es undefined');
    }

    // Limpiar editor actual
    this.limpiarCompletamenteLineaTiempo();

    // 1. Cargar configuración visual - CORREGIDO: usar data directamente
    if (plantillaData.data.canvasWidth && plantillaData.data.canvasHeight) {
      this.cargarConfiguracionVisual({
        canvasWidth: plantillaData.data.canvasWidth,
        canvasHeight: plantillaData.data.canvasHeight,
        backgroundColor: plantillaData.data.backgroundColor
      });
    }

    // 2. Cargar diseño de línea de tiempo - CORREGIDO: buscar en data.lineaDeTiempo
    if (plantillaData.data.lineaDeTiempo) {
      this.convertirLineaTiempoConfig(plantillaData.data.lineaDeTiempo);
      this.renderTimelineBase();
    } else {
      console.warn('⚠️ No hay línea de tiempo en la plantilla, usando diseño por defecto');
      this.renderTimelineBase();
    }

    // 3. Cargar elementos decorativos - CORREGIDO: buscar en data.elementosDecorativos
    if (plantillaData.data.elementosDecorativos) {
      this.cargarElementosDecorativos(plantillaData.data.elementosDecorativos);
    }

    // 4. Guardar zonas para eventos futuros - CORREGIDO: buscar en data.zonasEventos
    if (plantillaData.data.zonasEventos) {
      this.guardarZonasPlantilla(plantillaData.data.zonasEventos);
    }

  } catch (error) {
    console.error('Error aplicando plantilla:', error);
    this.renderTimelineBase();
    this.mostrarMensaje('Plantilla cargada con configuración básica');
  }
}

  


  crearElementosProyecto(): void {
    this.crearTituloProyecto();
    this.crearDescripcionProyecto();
  }


 crearTituloProyecto(): void {
  // Eliminar título anterior si existe
  if (this.proyectoTitleElement) {
    this.proyectoTitleElement.destroy();
  }

  // ✅ CORREGIDO: Usar SIEMPRE this.proyectoNombre
  const titulo = this.proyectoNombre || 'Mi Proyecto';

  this.proyectoTitleElement = new Konva.Text({
    x: 50,
    y: 30,
    text: titulo,
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#2c3e50',
    fontStyle: 'bold',
    draggable: true,
    width: this.stage.width() - 100,
    align: 'center'
  });

  // Configurar eventos de doble clic
  this.configurarEventosEdicion(this.proyectoTitleElement, 'titulo');

  this.mainLayer.add(this.proyectoTitleElement);
  this.mainLayer.batchDraw();
}


   crearDescripcionProyecto(): void {
  // Eliminar descripción anterior si existe
  if (this.proyectoDescriptionElement) {
    this.proyectoDescriptionElement.destroy();
  }

  // ✅ CORREGIDO: Usar SIEMPRE this.proyectoDescripcion
  const descripcion = this.proyectoDescripcion || 'Descripción del proyecto';

  this.proyectoDescriptionElement = new Konva.Text({
    x: 50,
    y: 70,
    text: descripcion,
    fontSize: 14,
    fontFamily: 'Arial',
    fill: '#5d6d7e',
    draggable: true,
    width: this.stage.width() - 100,
    align: 'center'
  });

  // Configurar eventos de doble clic
  this.configurarEventosEdicion(this.proyectoDescriptionElement, 'descripcion');

  this.mainLayer.add(this.proyectoDescriptionElement);
  this.mainLayer.batchDraw();
}

  configurarEventosEdicion(textNode: Konva.Text, tipo: 'titulo' | 'descripcion'): void {
    // Evento de doble clic para editar
    textNode.on('dblclick', (e) => {
      e.cancelBubble = true;
      this.iniciarEdicionTexto(textNode, tipo);
    });

    // Evento de arrastre
    textNode.on('dragend', () => {
      this.mainLayer.batchDraw();
    });

    // Transformer para redimensionar (opcional)
    const tr = new Konva.Transformer({
      nodes: [textNode],
      enabledAnchors: ['middle-left', 'middle-right'],
      keepRatio: false,
      rotateEnabled: false,
      borderStroke: '#3498db',
      anchorFill: '#3498db',
      anchorStroke: '#fff',
      anchorSize: 6
    });

    tr.visible(false);
    this.mainLayer.add(tr);

    // Mostrar transformer al hacer clic
    textNode.on('click', (e) => {
      e.cancelBubble = true;
      
      // Ocultar otros transformers
      this.mainLayer.find('Transformer').forEach((transformerNode: Konva.Node) => {
        const transformer = transformerNode as Konva.Transformer;
        if (transformer !== tr) {
          transformer.visible(false);
        }
      });

      tr.visible(true);
      this.mainLayer.draw();
    });

    textNode.setAttr('myTransformer', tr);
  }

   iniciarEdicionTexto(textNode: Konva.Text, tipo: 'titulo' | 'descripcion'|'personaje'): void {
    const stageBox = this.stage.container().getBoundingClientRect();
    const textPosition = textNode.absolutePosition();
    
    // Crear textarea para edición
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    // Estilos del textarea
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = (stageBox.top + textPosition.y) + 'px';
    textarea.style.left = (stageBox.left + textPosition.x) + 'px';
    textarea.style.width = (textNode.width() * textNode.scaleX()) + 'px';
    textarea.style.height = (textNode.height() * textNode.scaleY()) + 'px';
    textarea.style.fontSize = (textNode.fontSize() * textNode.scaleX()) + 'px';
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.color = textNode.fill() as string;
    textarea.style.background = 'rgba(255, 255, 255, 0.9)';
    textarea.style.border = '2px solid #3450dbff';
    textarea.style.padding = '5px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.textAlign = textNode.align() as any;
    textarea.style.zIndex = '1000';
    textarea.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    // Para título, limitar a una línea
    if (tipo === 'titulo') {
      textarea.style.whiteSpace = 'nowrap';
      textarea.style.overflow = 'hidden';
    }

    textarea.focus();
    textarea.select();

    // Manejar eventos del textarea
    const guardarCambios = () => {
      const nuevoTexto = textarea.value.trim();
      
      if (nuevoTexto) {
        textNode.text(nuevoTexto);
        
        // Actualizar también en las propiedades del componente
        if (tipo === 'titulo') {
          this.proyectoNombre = nuevoTexto;
        } else {
          this.proyectoDescripcion = nuevoTexto;
        }
      }

      document.body.removeChild(textarea);
      this.mainLayer.batchDraw();
    };

    textarea.addEventListener('keydown', (e) => {
      // Guardar con Enter (para título) o Ctrl+Enter (para descripción)
      if (e.key === 'Enter') {
        if (tipo === 'titulo' || e.ctrlKey) {
          e.preventDefault();
          guardarCambios();
        }
      }
      
      // Cancelar con Escape
      if (e.key === 'Escape') {
        document.body.removeChild(textarea);
        this.mainLayer.batchDraw();
      }
    });

    // Guardar al hacer clic fuera
    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(textarea)) {
          guardarCambios();
        }
      }, 100);
    });
  }

   cambiarEstiloTexto(tipo: 'titulo' | 'descripcion', propiedad: string, valor: any): void {
    const elemento = tipo === 'titulo' ? this.proyectoTitleElement : this.proyectoDescriptionElement;
    
    if (elemento) {
      switch (propiedad) {
        case 'color':
          elemento.fill(valor);
          break;
        case 'tamaño':
          elemento.fontSize(parseInt(valor));
          break;
        case 'fuente':
          elemento.fontFamily(valor);
          break;
        case 'negrita':
          elemento.fontStyle(valor ? 'bold' : 'normal');
          break;
        case 'cursiva':
          elemento.fontStyle(valor ? 'italic' : 'normal');
          break;
      }
      this.mainLayer.batchDraw();
    }
  }



   cargarPlantillasDiseno(): void {
    this.plantillasDisponibles = this.plantillaDesignService.obtenerPlantillas();
  }
   aplicarPlantillaDiseno(plantilla: any): void {
  // Usar setTimeout para asegurar que la operación sea asíncrona
  setTimeout(() => {
    try {
      this.cargarConfiguracionDiseno(plantilla.configuracion);
      this.showDesignTemplatesModal = false;
      
      // Forzar un redraw seguro
      setTimeout(() => {
        this.renderTimelineEventsSeguro();
      }, 100);
      
    } catch (error) {
      console.error('Error al aplicar plantilla:', error);
      alert('Error al aplicar la plantilla. Inténtalo de nuevo.');
    }
  }, 0);
}

private renderTimelineEventsSeguro(): void {
  try {
    this.renderTimelineEvents();
  } catch (error) {
    console.error('Error al renderizar eventos:', error);
    // Recrear el layer completo como fallback
    this.recrearCompletamente();
  }
}


async cargarMisProyectos(): Promise<void> {
    try {
      this.cargandoProyectos = true;
      
      const proyectos = await lastValueFrom(
        this.proyectoService.getProyectosByUsuario()
      );
      
      this.misProyectos = proyectos || [];
      
    } catch (error) {
      console.error('❌ Error cargando proyectos:', error);
      alert('Error al cargar los proyectos');
    } finally {
      this.cargandoProyectos = false;
    }
  }


  





 abrirModalGuardarProyecto(): void {
    // Si hay datos temporales del proyecto, cargarlos
    const proyectoTemporal = this.proyectoService.getProyectoTemporal();
    if (proyectoTemporal) {
      this.proyectoNombre = proyectoTemporal.titulo;
      this.proyectoDescripcion = proyectoTemporal.descripcion;
    }
    
    this.showSaveProjectModal = true;
  }


  cerrarModalGuardarProyecto(): void {
    this.showSaveProjectModal = false;
    this.proyectoGuardado = false;
  }

  abrirModalPortada(): void {
    this.showPortadaModal = true;
  }

  cerrarModalPortada(): void {
    this.showPortadaModal = false;
  }


  cancelarPortada(): void {
  this.showPortadaModal = false;
  this.portadaArchivo = null;
  this.proyectoPortada = '';
}

  onPortadaSelected(event: any): void {
  const file = event.target.files[0];

  
  if (!file) {
    console.log('No se seleccionó archivo');
    return;
  }

  // Validar que sea una imagen
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona un archivo de imagen');
    return;
  }

  // Validar tamaño (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 5MB.');
    return;
  }

  // PRIMERO: Guardar el archivo
  this.portadaArchivo = file;

  // SEGUNDO: Crear preview (asíncrono)
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.proyectoPortada = e.target.result;
  };
  reader.onerror = (error) => {
    console.error('❌ Error leyendo archivo para preview:', error);
  };
  reader.readAsDataURL(file);
}



  eliminarPortada(): void {
  if (this.proyectoPortada && this.proyectoActualId) {
    // Si hay una portada en el servidor, eliminarla
    this.eliminarPortadaDelServidor().then(() => {
      this.limpiarPortadaLocal();
    }).catch(error => {
      console.error('❌ Error eliminando portada del servidor, limpiando localmente:', error);
      this.limpiarPortadaLocal();
    });
  } else {
    // Solo limpiar localmente
    this.limpiarPortadaLocal();
  }
}



private async eliminarPortadaDelServidor(): Promise<void> {
  try {
    const usuario = await this.obtenerUsuarioActual();
    if (!usuario || !usuario.id || !this.proyectoActualId) {
      return;
    }

    // Obtener la URL actual de la portada del proyecto
    const proyectoActual = await lastValueFrom(
      this.proyectoService.getProyectoById(this.proyectoActualId)
    );
    const proyectoDataActual = this.proyectoService.parsearData(proyectoActual.data);
    const portadaUrl = proyectoDataActual.metadata?.portadaUrl;

    if (portadaUrl) {
      await this.eliminarPortadaAnterior(portadaUrl, usuario.id);
    }
  } catch (error) {
    console.error('❌ Error eliminando portada del servidor:', error);
    throw error;
  }
}

/**
 * ✅ Limpiar portada localmente
 */
private limpiarPortadaLocal(): void {
  this.proyectoPortada = '';
  this.portadaArchivo = null;
}

   private async subirPortadaProyecto(usuarioId: number, proyectoId: number): Promise<string> {
  
  if (!this.portadaArchivo) {
    return '';
  }

  try {
   
    const tipoUsuario = 'users';
    
    const respuesta = await lastValueFrom(
      this.archivoService.subirPortadaProyectoUser(this.portadaArchivo, usuarioId, proyectoId)
    );

    return this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
    
  } catch (error) {
    console.error('❌ Error subiendo portada:', error);
    
    // Debug detallado del error
    if (error instanceof HttpErrorResponse) {
      console.error('📋 Error HTTP en subida de portada:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error
      });
    }
    
    throw new Error('Error al subir la portada');
  }
}



  private async generarPortadaDesdeProyecto(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      this.ocultarElementosTemporales();
      this.stage.batchDraw();
      
      setTimeout(() => {
        try {
          const dataURL = this.stage.toDataURL({
            pixelRatio: 1,
            quality: 0.8,
            mimeType: 'image/jpeg'
          });
          
          //console.log('Portada automática generada correctamente');
          
          // Convertir data URL a File
          this.portadaArchivo = this.dataURLtoFile(dataURL, `portada-automatica-${Date.now()}.jpg`);
          this.proyectoPortada = dataURL;
          
          this.mostrarElementosTemporales();
          resolve();
          
        } catch (error) {
          console.error('❌ Error generando portada automática:', error);
          this.mostrarElementosTemporales();
          reject(error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error en generarPortadaDesdeProyecto:', error);
      this.mostrarElementosTemporales();
      reject(error);
    }
  });
}


private ocultarElementosTemporales(): void {
  try {
    //console.log('Ocultando elementos temporales...');
    
    // Ocultar todos los transformers (controles de edición)
    this.stage.find('Transformer').forEach((node: Konva.Node) => {
      if (node instanceof Konva.Transformer) {
        node.visible(false);
      }
    });
    
    //console.log('Elementos temporales ocultados');
  } catch (error) {
    console.error(' Error ocultando elementos temporales:', error);
  }
}

/**
 * ✅ Mostrar elementos temporales después de generar la portada
 */
private mostrarElementosTemporales(): void {
  try {
    //console.log('Mostrando elementos temporales...');
    
    // Mostrar todos los transformers
    this.stage.find('Transformer').forEach((node: Konva.Node) => {
      if (node instanceof Konva.Transformer) {
        node.visible(true);
      }
    });
    
   // console.log('✅ Elementos temporales mostrados');
  } catch (error) {
    console.error('Error mostrando elementos temporales:', error);
  }
}


private async eliminarPortadaAnterior(portadaUrl: string, usuarioId: number): Promise<void> {
  try {
    if (!portadaUrl || !this.proyectoActualId) {
      console.log('⚠️ No hay portada anterior para eliminar');
      return;
    }

    console.log('🗑️ Eliminando portada anterior:', portadaUrl);
    
    // Extraer el nombre del archivo de la URL
    const urlParts = portadaUrl.split('/');
    const nombreArchivo = urlParts[urlParts.length - 1];
    
    if (!nombreArchivo) {
      console.warn('⚠️ No se pudo extraer nombre de archivo de la URL');
      return;
    }

    // Llamar al servicio para eliminar el archivo
    await lastValueFrom(
      this.archivoService.eliminarArchivo('users', usuarioId, this.proyectoActualId, 'portadas', nombreArchivo)
    );
    
    console.log('✅ Portada anterior eliminada:', nombreArchivo);
    
  } catch (error) {
    console.error('❌ Error eliminando portada anterior:', error);
    // No lanzar error para no interrumpir el proceso principal
    throw error; // Opcional: depende de si quieres que falle todo o solo continue
  }
}
private esUrlServidor(url: string): boolean {
  if (!url) return false;
  
  // URLs que indican que ya están en el servidor
  const patronesServidor = [
    '/api/archivos/',
    '/assets/',
    '/uploads/',
    'storage/',
    'blob:'
  ];
  
  // Si es data URL, no es del servidor
  if (url.startsWith('data:')) {
    return false;
  }
  
  // Si es URL HTTP/HTTPS o contiene patrones del servidor
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         patronesServidor.some(patron => url.includes(patron));
}




private async procesarImagenesEventos(usuarioId: number, esProyectoNuevo: boolean): Promise<TimelineEvent[]> {
  return await Promise.all(
    this.timelineEvents.map(async (event, index) => {
      
      // ✅ CASO 1: Ya es URL del servidor → MANTENER (NO PROCESAR)
      if (event.image && this.esUrlServidor(event.image)) {
        console.log(`🔗 Manteniendo URL existente del servidor para evento ${event.year}:`, event.image);
        return event; // ← Retornar sin modificar
      }
      
      // ✅ CASO 2: Es data URL (imagen NUEVA) → SUBIR SOLO SI HAY proyectoActualId
      if (event.image && event.image.startsWith('data:image')) {
        // Solo subir si ya tenemos un proyecto guardado (no es nuevo o ya fue creado)
        if (this.proyectoActualId) {
          try {
            console.log(`📤 Subiendo NUEVA imagen para evento ${event.year}...`);
            const file = this.dataURLtoFile(event.image, `evento-${event.year}-${Date.now()}.png`);
            
            const respuesta = await lastValueFrom(
              this.archivoService.subirAssetProyectoUser(
                file, 
                usuarioId, 
                this.proyectoActualId
              )
            );
            
            const imageUrl = this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
            console.log(`✅ Nueva imagen subida para evento ${event.year}:`, imageUrl);
            
            return {
              ...event,
              image: imageUrl
            };
          } catch (error) {
            console.error(`❌ Error subiendo nueva imagen para evento ${event.year}:`, error);
            return { ...event, image: '' };
          }
        }
        
        // Para proyectos nuevos sin ID aún, mantener data URL temporal
        console.log(`💾 Manteniendo data URL temporal para evento ${event.year} (proyecto nuevo)`);
        return event;
      }
      
      // ✅ CASO 3: No hay imagen o imagen vacía → MANTENER
      //console.log(`⚪ Sin imagen para evento ${event.year}`);
      return { ...event, image: event.image || '' };
    })
  );
}



  async guardarProyecto(): Promise<void> {
  try {
    if (!this.proyectoNombre.trim()) {
      alert('Por favor, ingresa un nombre para el proyecto');
      return;
    }
    
    const usuario = await this.obtenerUsuarioActual();
    if (!usuario || !usuario.id) {
      alert('Error: Usuario no autenticado');
      return;
    }

    const proyectoTemporal = this.proyectoService.getProyectoTemporal();
    const plantillaId = proyectoTemporal?.plantillaId || null;

    // ✅ PASO 1: OBTENER PORTADA ANTERIOR (solo si es actualización)
    let portadaAnteriorUrl = '';
    if (this.proyectoActualId) {
      try {
        const proyectoActual = await lastValueFrom(
          this.proyectoService.getProyectoById(this.proyectoActualId)
        );
        const proyectoDataActual = this.proyectoService.parsearData(proyectoActual.data);
        portadaAnteriorUrl = proyectoDataActual.metadata?.portadaUrl || '';
        console.log('📋 Portada anterior encontrada:', portadaAnteriorUrl);
      } catch (error) {
        console.warn('⚠️ No se pudo obtener portada anterior:', error);
      }
    }

    // ✅ PASO 2: GENERAR PORTADA AUTOMÁTICA (si no hay archivo seleccionado)
    if (!this.portadaArchivo) {
      await this.generarPortadaDesdeProyecto();
    }

    // ✅ PASO 3: DETERMINAR SI ES PROYECTO NUEVO
    const esProyectoNuevo = !this.proyectoActualId;
    console.log(esProyectoNuevo ? '📝 Creando proyecto nuevo...' : '📝 Actualizando proyecto existente...');

    // ✅ PASO 4: PROCESAR IMÁGENES (UNA SOLA VEZ)
    const eventosProcesados = await this.procesarImagenesEventos(usuario.id, esProyectoNuevo);
    console.log(`✅ ${eventosProcesados.length} eventos procesados`);

    // ✅ PASO 5: PREPARAR EVENTOS CON ORDEN Y POSICIÓN
    const eventosConOrden = eventosProcesados.map((event, index) => {
      const grupoEvento = this.obtenerGrupoEvento(event);
      
      return {
        year: event.year,
        title: event.title,
        person: event.person,
        description: event.description,
        image: event.image || '',
        link: event.link || '',
        orden: index,
        posicionLibre: grupoEvento ? {
          x: grupoEvento.x(),
          y: grupoEvento.y()
        } : undefined,
        zonaDesign: (event as any).zonaDesign
      };
    });

    // ✅ PASO 6: CREAR/ACTUALIZAR PROYECTO (SIN PORTADA FINAL AÚN)
    const proyectoDataInicial: ProyectoData = {
      metadata: {
        nombre: this.proyectoNombre,
        descripcion: this.proyectoDescripcion || `Proyecto creado desde el editor`,
        fechaExportacion: new Date().toISOString(),
        version: '1.0',
        totalEventos: eventosConOrden.length,
        portadaUrl: portadaAnteriorUrl // ✅ Mantener la anterior por ahora
      },
      configuracion: {
        backgroundColor: this.backgroundColor,
        minYear: this.minYear,
        maxYear: this.maxYear,
        stageWidth: this.stage.width(),
        stageHeight: this.stage.height(),
        lineaDeTiempo: this.serializarLineaDeTiempo()
      },
      eventos: eventosConOrden,
      elementosKonva: this.serializarElementosKonva(),
      estilos: this.getEstilosBasicos()
    };

    const proyectoRequestInicial: ProyectoRequest = {
      titulo: this.proyectoNombre,
      descripcion: this.proyectoDescripcion,
      data: this.proyectoService.serializarData(proyectoDataInicial),
      plantillaBaseId: plantillaId // ✅ Siempre el mismo valor
    };

    let proyectoGuardado;

    if (esProyectoNuevo) {
      // Crear proyecto nuevo
      proyectoGuardado = await lastValueFrom(
        this.proyectoService.createProyecto(proyectoRequestInicial)
      );
      this.proyectoActualId = proyectoGuardado.id;
      console.log('✅ Proyecto creado con ID:', this.proyectoActualId);
    } else {
      // Actualizar proyecto existente
      proyectoGuardado = await lastValueFrom(
        this.proyectoService.updateProyecto(this.proyectoActualId!, proyectoRequestInicial)
      );
      console.log('✅ Proyecto actualizado');
    }

    // ✅ PASO 7: AHORA SÍ, MANEJAR LA PORTADA (con proyectoId garantizado)
    let portadaUrlFinal = portadaAnteriorUrl;

    if (this.portadaArchivo && this.proyectoActualId) {
      try {
        console.log('📤 Subiendo nueva portada...');
        
        // ✅ PRIMERO: Subir la nueva portada
        portadaUrlFinal = await this.subirPortadaProyecto(usuario.id, this.proyectoActualId);
        console.log('✅ Nueva portada subida:', portadaUrlFinal);
        
        // ✅ SEGUNDO: Eliminar la anterior (solo si la nueva se subió bien y son diferentes)
        if (portadaAnteriorUrl && portadaUrlFinal !== portadaAnteriorUrl) {
          try {
            await this.eliminarPortadaAnterior(portadaAnteriorUrl, usuario.id);
            console.log('🗑️ Portada anterior eliminada');
          } catch (error) {
            console.warn('⚠️ No se pudo eliminar portada anterior (no crítico):', error);
          }
        }
        
      } catch (error) {
        console.error('❌ Error subiendo portada:', error);
        // Si falla la subida, mantener la anterior
        portadaUrlFinal = portadaAnteriorUrl;
      }
    } else if (!this.portadaArchivo && portadaAnteriorUrl) {
      // Mantener la anterior si no hay nueva
      console.log('ℹ️ Manteniendo portada anterior');
      portadaUrlFinal = portadaAnteriorUrl;
    }

    // ✅ PASO 8: ACTUALIZAR CON LA PORTADA FINAL (solo si cambió)
    if (portadaUrlFinal !== portadaAnteriorUrl) {
      console.log('📝 Actualizando proyecto con nueva portada...');
      
      const proyectoDataFinal: ProyectoData = {
        ...proyectoDataInicial,
        metadata: {
          ...proyectoDataInicial.metadata,
          portadaUrl: portadaUrlFinal
        }
      };

      const proyectoRequestFinal: ProyectoRequest = {
        titulo: this.proyectoNombre,
        descripcion: this.proyectoDescripcion,
        data: this.proyectoService.serializarData(proyectoDataFinal),
        plantillaBaseId: plantillaId // ✅ Mismo valor
      };

      await lastValueFrom(
        this.proyectoService.updateProyecto(this.proyectoActualId!, proyectoRequestFinal)
      );
      
      console.log('✅ Proyecto actualizado con portada');
    }

    // ✅ PASO 9: FINALIZAR
    console.log('🎉 Proyecto guardado completamente');
    console.log('📊 Resumen:', {
      id: this.proyectoActualId,
      titulo: this.proyectoNombre,
      eventos: eventosConOrden.length,
      portada: portadaUrlFinal || 'Sin portada'
    });

    this.proyectoGuardado = true;
    this.proyectoService.clearProyectoTemporal();
    this.portadaArchivo = null; // ✅ Limpiar archivo temporal
    
    setTimeout(() => {
      this.cerrarModalGuardarProyecto();
      this.cargarMisProyectos();
    }, 2000);

  } catch (error) {
    console.error('❌ Error guardando proyecto:', error);
    
    if (error instanceof HttpErrorResponse) {
      console.error('📋 Detalles del error HTTP:', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error,
        message: error.message
      });
    }
    
    alert('Error al guardar el proyecto. Por favor, intenta nuevamente.');
  }
}


private obtenerGrupoEvento(event: TimelineEvent): Konva.Group | null {
  const grupos = this.mainLayer.find('Group');
  
  for (let i = 0; i < grupos.length; i++) {
    const grupo = grupos[i] as Konva.Group;
    const eventoAsociado = grupo.getAttr('timelineEvent');
    
    if (eventoAsociado && 
        eventoAsociado.year === event.year && 
        eventoAsociado.title === event.title) {
      return grupo;
    }
  }
  
  return null;
}

private serializarLineaDeTiempo(): any {
  const layout = this.currentTimelineDesign.layout;
  const lineStyle = this.currentTimelineDesign.lineStyle;

  return {
    tipo: layout.type,
    designId: this.selectedTimelineDesignId,
    positionX: layout.positionX,
    positionY: layout.positionY,
    amplitude: layout.amplitude,
    frequency: layout.frequency,
    intensity: layout.intensity,
    intensitycurva: layout.intensitycurva,
    anchoTotal: layout.anchoTotal,
    turns: layout.turns,
    estilo: {
      stroke: lineStyle.stroke,
      strokeWidth: lineStyle.strokeWidth,
      lineCap: lineStyle.lineCap
    }
  };
}


changeTimelineDesign(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const designId = selectElement.value;
    
    if (designId) {
      const design = this.timelineDesignService.getTimelineDesignById(designId);
      if (design) {
        this.currentTimelineDesign = design;
        this.selectedTimelineDesignId = designId;
        this.renderTimelineBase(); // Re-dibujar la línea base
        console.log('✅ Diseño de timeline cambiado a:', design.name);
      }
    }
  }

   renderTimelineBase(): void {
  // ✅ ELIMINAR COMPLETAMENTE la línea base anterior y todos sus elementos
  this.limpiarCompletamenteLineaTiempo();
  
  const layout = this.currentTimelineDesign.layout;

  // Crear línea según el tipo de layout
  switch (layout.type) {
    case 'horizontal':
      this.drawHorizontalTimeline();
      break;
    case 'vertical':
      this.drawVerticalTimeline();
      break;
    case 'curve':
      this.drawCurvedTimeline();
      break;
    case 'wave':
      this.drawWaveTimeline();
      break;
    case 'zigzag':
      this.drawZigzagTimeline();
      break;
    case 'spiral':
      this.drawSpiralTimeline();
      break;
    case 's-curve': // ✅ NUEVO
      this.drawSCurveTimeline();
      break;
    case 'custom': // ✅ NUEVO
      this.drawCustomTimeline();
      break;
    default:
      this.drawHorizontalTimeline(); // Fallback
  }

  // Dibujar marcadores según el layout
  this.drawTimelineMarkers();

  // Dibujar fondo si está configurado
  this.drawTimelineBackground(this.getTimelineYPosition());

  this.mainLayer.batchDraw();
  
}

  private drawHorizontalTimeline(): void {
  const y = this.getTimelineYPosition();
  const lineStyle = this.currentTimelineDesign.lineStyle;

  const timeline = new Konva.Line({
    id: 'timeline-base', // ✅ MISMO ID para todas las líneas
    points: [50, y, this.stage.width() - 50, y],
    stroke: lineStyle.stroke,
    strokeWidth: lineStyle.strokeWidth,
    lineCap: lineStyle.lineCap as any,
    dash: lineStyle.dashArray,
    shadowColor: lineStyle.shadow?.color,
    shadowBlur: lineStyle.shadow?.blur,
    shadowOffset: lineStyle.shadow?.offset,
    shadowOpacity: lineStyle.shadow?.opacity
  });

  this.mainLayer.add(timeline);
}



  private drawVerticalTimeline(): void {
  const x = this.getTimelineXPosition();
  const lineStyle = this.currentTimelineDesign.lineStyle;

  const timeline = new Konva.Line({
    id: 'timeline-base', // ✅ MISMO ID
    points: [x, 100, x, this.stage.height() - 100],
    stroke: lineStyle.stroke,
    strokeWidth: lineStyle.strokeWidth,
    lineCap: lineStyle.lineCap as any,
    dash: lineStyle.dashArray,
    shadowColor: lineStyle.shadow?.color,
    shadowBlur: lineStyle.shadow?.blur,
    shadowOffset: lineStyle.shadow?.offset,
    shadowOpacity: lineStyle.shadow?.opacity
  });

  this.mainLayer.add(timeline);
}


  private drawCurvedTimeline(): void {
    const layout = this.currentTimelineDesign.layout;
    const lineStyle = this.currentTimelineDesign.lineStyle;
    const curvature = layout.curvature || 0.3;

    const startX = 50;
    const endX = this.stage.width() - 50;
    const centerY = this.stage.height() / 2;
    const controlY = centerY + (this.stage.height() * curvature);

    // Crear curva Bézier
    const timeline = new Konva.Line({
      id: 'timeline-base',
      points: [
        startX, centerY,
        (startX + endX) / 2, controlY,
        endX, centerY
      ],
      stroke: lineStyle.stroke,
      strokeWidth: lineStyle.strokeWidth,
      lineCap: lineStyle.lineCap as any,
      dash: lineStyle.dashArray,
      tension: 0.5, // Para hacerla curva
      shadowColor: lineStyle.shadow?.color,
      shadowBlur: lineStyle.shadow?.blur,
      shadowOffset: lineStyle.shadow?.offset,
      shadowOpacity: lineStyle.shadow?.opacity
    });

    this.mainLayer.add(timeline);
  }

 private drawWaveTimeline(): void {
  const layout = this.currentTimelineDesign.layout;
  const lineStyle = this.currentTimelineDesign.lineStyle;
  
  // ✅ USAR VALORES DE CONFIGURACIÓN CORRECTOS
  const baseY = layout.positionY || this.stage.height() / 2;
  const amplitude = layout.amplitude || layout.intensity || 30;
  const frequency = layout.frequency || 0.02;
  const startX = 50;
  const endX = this.stage.width() - 50;

  console.log('🌊 Dibujando línea Wave:', { 
    baseY, 
    amplitude, 
    frequency,
    startX,
    endX,
    positionX: layout.positionX 
  });

  const points: number[] = [];
  for (let x = startX; x <= endX; x += 5) {
    const y = baseY + Math.sin((x - startX) * frequency) * amplitude;
    points.push(x, y);
  }

  const timeline = new Konva.Line({
    id: 'timeline-base',
    points: points,
    stroke: lineStyle.stroke,
    strokeWidth: lineStyle.strokeWidth,
    lineCap: lineStyle.lineCap as any,
    dash: lineStyle.dashArray,
    shadowColor: lineStyle.shadow?.color,
    shadowBlur: lineStyle.shadow?.blur,
    shadowOffset: lineStyle.shadow?.offset,
    shadowOpacity: lineStyle.shadow?.opacity
  });

  this.mainLayer.add(timeline);
  console.log('✅ Línea Wave creada con', points.length / 2, 'puntos');
}

  private drawZigzagTimeline(): void {
    const layout = this.currentTimelineDesign.layout;
    const lineStyle = this.currentTimelineDesign.lineStyle;
    const amplitude = layout.amplitude || 40;
    const segments = layout.segments || 20;

    const centerY = this.stage.height() / 2;
    const segmentWidth = (this.stage.width() - 100) / segments;
    const points: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const x = 50 + (i * segmentWidth);
      const y = centerY + (i % 2 === 0 ? -amplitude : amplitude);
      points.push(x, y);
    }

    const timeline = new Konva.Line({
      id: 'timeline-base',
      points: points,
      stroke: lineStyle.stroke,
      strokeWidth: lineStyle.strokeWidth,
      lineCap: lineStyle.lineCap as any,
      dash: lineStyle.dashArray,
      shadowColor: lineStyle.shadow?.color,
      shadowBlur: lineStyle.shadow?.blur,
      shadowOffset: lineStyle.shadow?.offset,
      shadowOpacity: lineStyle.shadow?.opacity
    });

    this.mainLayer.add(timeline);
  }

  private drawSpiralTimeline(): void {
    const layout = this.currentTimelineDesign.layout;
    const lineStyle = this.currentTimelineDesign.lineStyle;
    const segments = layout.segments || 36;

    const centerX = this.stage.width() / 2;
    const centerY = this.stage.height() / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;
    const points: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 4; // 2 vueltas completas
      const radius = (i / segments) * maxRadius;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push(x, y);
    }

    const timeline = new Konva.Line({
      id: 'timeline-base',
      points: points,
      stroke: lineStyle.stroke,
      strokeWidth: lineStyle.strokeWidth,
      lineCap: lineStyle.lineCap as any,
      dash: lineStyle.dashArray,
      shadowColor: lineStyle.shadow?.color,
      shadowBlur: lineStyle.shadow?.blur,
      shadowOffset: lineStyle.shadow?.offset,
      shadowOpacity: lineStyle.shadow?.opacity
    });

    this.mainLayer.add(timeline);
  }

  private getTimelineYPosition(): number {
    const layout = this.currentTimelineDesign.layout;
    
    switch (layout.orientation) {
      case 'top': return 100;
      case 'bottom': return this.stage.height() - 100;
      default: return this.stage.height() / 2;
    }
  }

  private getTimelineXPosition(): number {
    const layout = this.currentTimelineDesign.layout;
    
    switch (layout.orientation) {
      case 'left': return 100;
      case 'right': return this.stage.width() - 100;
      default: return this.stage.width() / 2;
    }
  }

    private drawTimelineMarkers(): void {
    this.currentTimelineDesign.markers.forEach(markerConfig => {
      this.drawMarkerType(markerConfig);
    });
  }

   private drawMarkerType(markerConfig: MarkerStyle): void {
    const range = this.maxYear - this.minYear;
    const layout = this.currentTimelineDesign.layout;

    for (let year = this.minYear; year <= this.maxYear; year += markerConfig.interval) {
      const position = this.calculateMarkerPosition(year, range, layout);
      
      if (position) {
        this.drawSingleMarker(position.x, position.y, year, markerConfig);
      }
    }
  }

  private calculateMarkerPosition(year: number, range: number, layout: TimelineLayout): { x: number; y: number } | null {
    const progress = (year - this.minYear) / range;

    switch (layout.type) {
      case 'horizontal':
        const x = 50 + (progress * (this.stage.width() - 100));
        const y = this.getTimelineYPosition();
        return { x, y };

      case 'vertical':
        const xVert = this.getTimelineXPosition();
        const yVert = 100 + (progress * (this.stage.height() - 200));
        return { x: xVert, y: yVert };

      case 'curve':
        return this.calculateCurveMarkerPosition(progress);

      case 'wave':
        return this.calculateWaveMarkerPosition(progress);

      case 'zigzag':
        return this.calculateZigzagMarkerPosition(progress);

      case 'spiral':
        return this.calculateSpiralMarkerPosition(progress);

      default:
        return null;
    }
  }

   private calculateCurveMarkerPosition(progress: number): { x: number; y: number } {
    const layout = this.currentTimelineDesign.layout;
    const curvature = layout.curvature || 0.3;

    const startX = 50;
    const endX = this.stage.width() - 50;
    const centerY = this.stage.height() / 2;
    const controlY = centerY + (this.stage.height() * curvature);

    // Calcular posición en curva Bézier
    const t = progress;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + endX) / 2) + t * t * endX;
    const y = (1 - t) * (1 - t) * centerY + 2 * (1 - t) * t * controlY + t * t * centerY;

    return { x, y };
  }

  private calculateWaveMarkerPosition(progress: number): { x: number; y: number } {
    const layout = this.currentTimelineDesign.layout;
    const amplitude = layout.amplitude || 30;
    const frequency = layout.frequency || 0.02;

    const centerY = this.stage.height() / 2;
    const x = 50 + (progress * (this.stage.width() - 100));
    const y = centerY + Math.sin(x * frequency) * amplitude;

    return { x, y };
  }

  private calculateZigzagMarkerPosition(progress: number): { x: number; y: number } {
    const layout = this.currentTimelineDesign.layout;
    const amplitude = layout.amplitude || 40;
    const segments = layout.segments || 20;

    const centerY = this.stage.height() / 2;
    const segmentIndex = Math.floor(progress * segments);
    const segmentProgress = (progress * segments) - segmentIndex;

    const x = 50 + (progress * (this.stage.width() - 100));
    const baseY = segmentIndex % 2 === 0 ? centerY - amplitude : centerY + amplitude;
    const nextY = (segmentIndex + 1) % 2 === 0 ? centerY - amplitude : centerY + amplitude;
    const y = baseY + (segmentProgress * (nextY - baseY));

    return { x, y };
  }

  private calculateSpiralMarkerPosition(progress: number): { x: number; y: number } {
    const layout = this.currentTimelineDesign.layout;
    const segments = layout.segments || 36;

    const centerX = this.stage.width() / 2;
    const centerY = this.stage.height() / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;

    const angle = progress * Math.PI * 4; // 2 vueltas completas
    const radius = progress * maxRadius;

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    return { x, y };
  }



  private drawSingleMarker(x: number, centerY: number, year: number, markerConfig: MarkerStyle): void {
    const markerStyle = markerConfig.style;
    
    // Dibujar marcador según la forma
    let marker: Konva.Shape;
    
    switch (markerStyle.shape) {
      case 'line':
        marker = new Konva.Line({
          points: [x, centerY - markerStyle.size, x, centerY + markerStyle.size],
          stroke: markerStyle.color,
          strokeWidth: 2
        });
        break;
      
      case 'circle':
        marker = new Konva.Circle({
          x: x,
          y: centerY,
          radius: markerStyle.size,
          fill: markerStyle.color
        });
        break;
      
      case 'triangle':
        marker = new Konva.Line({
          points: [x, centerY - markerStyle.size, x - markerStyle.size, centerY + markerStyle.size, x + markerStyle.size, centerY + markerStyle.size],
          closed: true,
          fill: markerStyle.color
        });
        break;
      
      case 'square':
        marker = new Konva.Rect({
          x: x - markerStyle.size / 2,
          y: centerY - markerStyle.size / 2,
          width: markerStyle.size,
          height: markerStyle.size,
          fill: markerStyle.color
        });
        break;
    }

    /*if (marker) {
      marker.setAttr('class', 'timeline-marker');
      this.mainLayer.add(marker);

      // Dibujar etiqueta si está habilitada
      /*if (markerStyle.label.show) {
        this.drawMarkerLabel(x, centerY, year, markerConfig);
      }
    }*/
  }


  private drawMarkerLabel(x: number, centerY: number, year: number, markerConfig: MarkerStyle): void {
    const labelStyle = markerConfig.style.label;
    const markerSize = markerConfig.style.size;
    const offset = markerSize + 5;
    
    let yPosition = centerY;
    
    if (markerConfig.position === 'above') {
      yPosition = centerY - offset;
    } else if (markerConfig.position === 'below') {
      yPosition = centerY + offset;
    }

    const label = new Konva.Text({
      x: x,
      y: yPosition,
      text: year.toString(),
      fontSize: labelStyle.fontSize,
      fontFamily: labelStyle.fontFamily,
      fill: labelStyle.color,
      align: 'center'
    });

    // Centrar el texto
    label.offsetX(label.width() / 2);
    label.offsetY(label.height() / 2);

    label.setAttr('class', 'timeline-marker');
    this.mainLayer.add(label);
  }

 private drawTimelineBackground(centerY: number): void {
  if (!this.currentTimelineDesign.background || 
      this.currentTimelineDesign.background.type === 'none') {
    return;
  }

  const bgConfig = this.currentTimelineDesign.background;
  const height = 20; // Altura del área de fondo

  let background: Konva.Shape | null = null;

  if (bgConfig.type === 'gradient' && bgConfig.gradient) {
    // Para gradientes necesitarías una implementación más compleja
    // Por simplicidad, usamos un rectángulo sólido por ahora
    background = new Konva.Rect({
      x: 50,
      y: centerY - height / 2,
      width: this.stage.width() - 100,
      height: height,
      fill: bgConfig.gradient.startColor,
      opacity: bgConfig.opacity
    });
  } else if (bgConfig.color) {
    background = new Konva.Rect({
      x: 50,
      y: centerY - height / 2,
      width: this.stage.width() - 100,
      height: height,
      fill: bgConfig.color,
      opacity: bgConfig.opacity
    });
  }

  // Verificar que background fue creado antes de usarlo
  if (background) {
    background.setAttr('class', 'timeline-background');
    this.mainLayer.add(background);
    background.moveToBottom(); // Enviar al fondo
  }
}
  // Actualizar onResize para re-renderizar la timeline
  




private async obtenerUsuarioActual(): Promise<any> {
  try {
    // Si tu AuthService tiene un método para obtener el usuario actual
    if (this.authService.getCurrentUser) {
      return this.authService.getCurrentUser();
    }
    
    // Si no, intenta obtener el ID del usuario del token
    const token = this.authService.getToken();
    if (token) {
      // Decodificar el token JWT para obtener el userId
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.userId || payload.sub };
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error);
    return null;
  }
}

  private dataURLtoFile(dataurl: string, filename: string): File {
  try {
    // Validar que sea un data URL válido
    if (!dataurl || !dataurl.startsWith('data:')) {
      throw new Error('Invalid data URL');
    }

    const arr = dataurl.split(',');
    if (arr.length < 2) {
      throw new Error('Invalid data URL format');
    }

    // Extraer MIME type de forma segura
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'; // Fallback a image/png
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
    
  } catch (error) {
    console.error('❌ Error convirtiendo data URL a File:', error);
    // Crear un archivo vacío como fallback
    return new File([], filename, { type: 'image/png' });
  }
}



/**
 * ✅ INICIALIZAR RESIZE - Configurar eventos para redimensionar
 */
private setupCanvasResize(): void {
  // Agregar event listeners para los bordes
  this.stage.content.addEventListener('dblclick', this.handleStageDoubleClick.bind(this));
  this.stage.content.addEventListener('mousedown', this.handleResizeMouseDown.bind(this));
  document.addEventListener('mousemove', this.handleResizeMouseMove.bind(this));
  document.addEventListener('mouseup', this.handleResizeMouseUp.bind(this));
}

/**
 * ✅ MANEJAR DOBLE CLIC - Activar modo resize en bordes
 */
private handleStageDoubleClick(event: MouseEvent): void {
  if (this.isResizing) return;
  
  const stageRect = this.stage.container().getBoundingClientRect();
  const mouseX = event.clientX - stageRect.left;
  const mouseY = event.clientY - stageRect.top;
  
  const tolerance = 10; // Pixeles de tolerancia para detectar borde
  const handle = this.getResizeHandle(mouseX, mouseY, tolerance);
  
  if (handle) {
    event.preventDefault();
    event.stopPropagation();
    this.activateResizeMode(handle);
  }
}

/**
 * ✅ DETECTAR MANIJA DE REDIMENSION - Según posición del mouse
 */
private getResizeHandle(mouseX: number, mouseY: number, tolerance: number): string {
  const width = this.stage.width();
  const height = this.stage.height();
  
  const isNearLeft = mouseX <= tolerance;
  const isNearRight = mouseX >= width - tolerance;
  const isNearTop = mouseY <= tolerance;
  const isNearBottom = mouseY >= height - tolerance;
  
  if (isNearTop && isNearLeft) return 'nw';
  if (isNearTop && isNearRight) return 'ne';
  if (isNearBottom && isNearLeft) return 'sw';
  if (isNearBottom && isNearRight) return 'se';
  if (isNearLeft) return 'w';
  if (isNearRight) return 'e';
  if (isNearTop) return 'n';
  if (isNearBottom) return 's';
  
  return '';
}

/**
 * ✅ ACTIVAR MODO REDIMENSION
 */
private activateResizeMode(handle: string): void {
  this.isResizing = true;
  this.resizeHandle = handle;
  
  // Cambiar cursor según la manija
  const cursor = this.getResizeCursor(handle);
  this.stage.container().style.cursor = cursor;
  
  console.log(`📐 Modo resize activado: ${handle}`);
}

/**
 * ✅ OBTENER CURSOR SEGÚN MANIJA
 */
private getResizeCursor(handle: string): string {
  const cursors: { [key: string]: string } = {
    'n': 'ns-resize',
    's': 'ns-resize',
    'e': 'ew-resize',
    'w': 'ew-resize',
    'ne': 'nesw-resize',
    'nw': 'nwse-resize',
    'se': 'nwse-resize',
    'sw': 'nesw-resize'
  };
  return cursors[handle] || 'default';
}

/**
 * ✅ MANEJAR MOUSE DOWN PARA RESIZE
 */
private handleResizeMouseDown(event: MouseEvent): void {
  if (!this.isResizing) return;
  
  event.preventDefault();
  
  this.originalMouseX = event.clientX;
  this.originalMouseY = event.clientY;
  this.originalCanvasWidth = this.canvasWidth;
  this.originalCanvasHeight = this.canvasHeight;
  
  console.log(`🔧 Iniciando resize desde: ${this.canvasWidth}x${this.canvasHeight}`);
}

/**
 * ✅ MANEJAR MOUSE MOVE PARA RESIZE
 */
private handleResizeMouseMove(event: MouseEvent): void {
  if (!this.isResizing) return;
  
  const deltaX = event.clientX - this.originalMouseX;
  const deltaY = event.clientY - this.originalMouseY;
  
  let newWidth = this.originalCanvasWidth;
  let newHeight = this.originalCanvasHeight;
  
  // Calcular nuevas dimensiones según la manija
  switch (this.resizeHandle) {
    case 'e':
      newWidth = Math.max(400, this.originalCanvasWidth + deltaX);
      break;
    case 'w':
      newWidth = Math.max(400, this.originalCanvasWidth - deltaX);
      break;
    case 's':
      newHeight = Math.max(300, this.originalCanvasHeight + deltaY);
      break;
    case 'n':
      newHeight = Math.max(300, this.originalCanvasHeight - deltaY);
      break;
    case 'se':
      newWidth = Math.max(400, this.originalCanvasWidth + deltaX);
      newHeight = Math.max(300, this.originalCanvasHeight + deltaY);
      break;
    case 'sw':
      newWidth = Math.max(400, this.originalCanvasWidth - deltaX);
      newHeight = Math.max(300, this.originalCanvasHeight + deltaY);
      break;
    case 'ne':
      newWidth = Math.max(400, this.originalCanvasWidth + deltaX);
      newHeight = Math.max(300, this.originalCanvasHeight - deltaY);
      break;
    case 'nw':
      newWidth = Math.max(400, this.originalCanvasWidth - deltaX);
      newHeight = Math.max(300, this.originalCanvasHeight - deltaY);
      break;
  }
  
  this.resizeCanvas(newWidth, newHeight);
}

/**
 * ✅ REDIMENSIONAR CANVAS
 */
private resizeCanvas(width: number, height: number): void {
  this.canvasWidth = Math.round(width);
  this.canvasHeight = Math.round(height);
  
  // Actualizar dimensiones del stage
  this.stage.width(this.canvasWidth);
  this.stage.height(this.canvasHeight);
  
  // Actualizar fondo
  this.updateBackgroundColor(this.backgroundColor);
  
  // Re-renderizar timeline
  this.renderTimelineBase();
  this.renderTimelineEvents();
  
  // Actualizar elementos del proyecto
  if (this.proyectoTitleElement) {
    this.proyectoTitleElement.width(this.canvasWidth - 100);
  }
  if (this.proyectoDescriptionElement) {
    this.proyectoDescriptionElement.width(this.canvasWidth - 100);
  }
  
  this.stage.batchDraw();
}

/**
 * ✅ MANEJAR MOUSE UP PARA RESIZE
 */
private handleResizeMouseUp(): void {
  if (this.isResizing) {
    this.isResizing = false;
    this.stage.container().style.cursor = 'default';
    
    console.log(`✅ Resize completado: ${this.canvasWidth}x${this.canvasHeight}`);
  }
}



/**
 * ✅ ESTABLECER DIMENSIONES ESPECÍFICAS
 */
setCanvasDimensions(width: number, height: number): void {
  const validWidth = Math.max(400, Math.min(5000, width));
  const validHeight = Math.max(300, Math.min(5000, height));
  
  this.resizeCanvas(validWidth, validHeight);
}

/**
 * ✅ ESTABLECER TAMAÑO PREDETERMINADO
 */
setPresetSize(size: 'a4' | 'a3' | 'hd' | 'square' | 'custom'): void {
  const presets: { [key: string]: { width: number; height: number } } = {
    'a4': { width: 794, height: 1123 }, // A4 en pixels a 96 DPI
    'a3': { width: 1123, height: 1587 }, // A3 en pixels
    'hd': { width: 1280, height: 720 }, // HD
    'square': { width: 1000, height: 1000 }, // Cuadrado
    'custom': { width: this.canvasWidth, height: this.canvasHeight }
  };
  
  const preset = presets[size];
  if (preset) {
    this.setCanvasDimensions(preset.width, preset.height);
  }
}


/**
 * ✅ MOSTRAR INDICADORES DE BORDE (solo durante hover)
 */
private showResizeHandles(): void {
  // Esto se puede llamar durante el hover para mostrar manijas visuales
  const handles = this.createResizeHandles();
  handles.forEach(handle => {
    this.mainLayer.add(handle);
  });
  this.mainLayer.batchDraw();
}

/**
 * ✅ CREAR MANIJAS VISUALES DE REDIMENSION
 */
private createResizeHandles(): Konva.Rect[] {
  const width = this.stage.width();
  const height = this.stage.height();
  const handleSize = 8;
  
  const handles: Konva.Rect[] = [];
  const positions = [
    { x: 0, y: 0, handle: 'nw' }, // Esquina superior izquierda
    { x: width / 2, y: 0, handle: 'n' }, // Borde superior
    { x: width, y: 0, handle: 'ne' }, // Esquina superior derecha
    { x: width, y: height / 2, handle: 'e' }, // Borde derecho
    { x: width, y: height, handle: 'se' }, // Esquina inferior derecha
    { x: width / 2, y: height, handle: 's' }, // Borde inferior
    { x: 0, y: height, handle: 'sw' }, // Esquina inferior izquierda
    { x: 0, y: height / 2, handle: 'w' } // Borde izquierdo
  ];
  
  positions.forEach(pos => {
    const handle = new Konva.Rect({
      x: pos.x - (pos.x === 0 ? 0 : handleSize / 2),
      y: pos.y - (pos.y === 0 ? 0 : handleSize / 2),
      width: handleSize,
      height: handleSize,
      fill: '#007bff',
      stroke: '#ffffff',
      strokeWidth: 1,
      cornerRadius: 1,
      listening: false, // No captura eventos
      opacity: 0.7
    });
    
    handle.setAttr('resizeHandle', pos.handle);
    handles.push(handle);
  });
  
  return handles;
}



/**
 * ✅ MANEJAR CAMBIO DE ANCHO DESDE INPUT
 */
onWidthChange(event: any): void {
  const newWidth = parseInt(event.target.value);
  if (!isNaN(newWidth) && newWidth >= 400 && newWidth <= 5000) {
    this.setCanvasDimensions(newWidth, this.canvasHeight);
  }
}

/**
 * ✅ MANEJAR CAMBIO DE ALTO DESDE INPUT
 */
onHeightChange(event: any): void {
  const newHeight = parseInt(event.target.value);
  if (!isNaN(newHeight) && newHeight >= 300 && newHeight <= 5000) {
    this.setCanvasDimensions(this.canvasWidth, newHeight);
  }
}

private clearResizeHandles(): void {
  const handles = this.mainLayer.find('.resize-handle');
  handles.forEach(handle => {
    handle.destroy();
  });
  this.mainLayer.batchDraw();
}



  async actualizarProyecto(id: number): Promise<void> {
  try {

    const proyectoTemporal = this.proyectoService.getProyectoTemporal();
    const plantillaId = proyectoTemporal?.plantillaId || null;

    const proyectoData: ProyectoData = {
      metadata: {
        nombre: this.proyectoNombre,
        descripcion: this.proyectoDescripcion,
        fechaExportacion: new Date().toISOString(),
        version: '1.0',
        totalEventos: this.timelineEvents.length
      },
      configuracion: {
        backgroundColor: this.backgroundColor,
        minYear: this.minYear,
        maxYear: this.maxYear,
        stageWidth: this.stage.width(),
        stageHeight: this.stage.height(),
        lineaDeTiempo: this.serializarLineaDeTiempo()
      },
      eventos: this.timelineEvents.map(event => ({
        year: event.year,
        title: event.title,
        person: event.person,
        description: event.description,
        image: event.image || '' // ← Asegurar que siempre sea string
      })),
      elementosKonva: this.serializarElementosKonva(),
      estilos: this.getEstilosBasicos()
    };

    const proyectoRequest: ProyectoRequest = {
      titulo: this.proyectoNombre,
      descripcion: this.proyectoDescripcion,
      data: this.proyectoService.serializarData(proyectoData),
      plantillaBaseId: plantillaId
    };

    // Usar lastValueFrom en lugar de toPromise()
    const proyectoActualizado = await lastValueFrom(
      this.proyectoService.updateProyecto(id, proyectoRequest)
    );
    
    console.log('✅ Proyecto actualizado:', proyectoActualizado);
    this.proyectoGuardado = true;

  } catch (error) {
    console.error('❌ Error actualizando proyecto:', error);
    alert('Error al actualizar el proyecto');
  }
}
private getEstilosBasicos(): any {
  return {
    backgroundColor: this.backgroundColor,
    timelineDesignId: this.selectedTimelineDesignId,
    eventDesignId: this.currentEventDesign?.id || 'default-with-image',
    canvasWidth: this.canvasWidth,
    canvasHeight: this.canvasHeight
  };
}

  async cargarProyecto(id: number): Promise<void> {
    try {
      console.log('📥 Iniciando carga del proyecto ID:', id);
      
      const proyecto = await lastValueFrom(
        this.proyectoService.getProyectoById(id)
      );
      
      if (!proyecto) {
        throw new Error('No se pudo cargar el proyecto');
      }
      
      // Parsear los datos del proyecto
      const proyectoData: ProyectoData = this.proyectoService.parsearData(proyecto.data);
      
      // Cargar el proyecto en el editor
      this.cargarProyectoDesdeData(proyectoData, proyecto.titulo, proyecto.descripcion);
      
      // Guardar referencia al proyecto actual
      this.proyectoActualId = id;
      this.proyectoNombre = proyecto.titulo;
      this.proyectoDescripcion = proyecto.descripcion;
      
      console.log('✅ Proyecto cargado exitosamente:', {
        id: id,
        titulo: proyecto.titulo,
        eventos: proyectoData.eventos?.length || 0,
        elementos: proyectoData.elementosKonva?.length || 0
      });
      
      //this.mostrarMensaje(`Proyecto "${proyecto.titulo}" cargado correctamente jelr`);
      
    } catch (error) {
      console.error('❌ Error cargando proyecto:', error);
      alert('Error al cargar el proyecto: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      
      // Opcional: redirigir a mis-proyectos si falla la carga
      // this.router.navigate(['/mis-proyectos']);
    }
  }




  contarEventosProyecto(proyecto: any): number {
    try {
      const data = this.proyectoService.parsearData(proyecto.data);
      return data.eventos?.length || 0;
    } catch {
      return 0;
    }
  }


  async actualizarProyectoActual(): Promise<void> {
  if (!this.proyectoActualId) {
    alert('No hay proyecto actual para actualizar');
    return;
  }

  try {
    const usuario = await this.obtenerUsuarioActual();
    if (!usuario || !usuario.id) {
      alert('Error: Usuario no autenticado');
      return;
    }

    const proyectoTemporal = this.proyectoService.getProyectoTemporal();
    const plantillaId = proyectoTemporal?.plantillaId || null;

    // 1. Obtener datos actuales del proyecto para eliminar portada anterior si es necesario
    const proyectoActual = await lastValueFrom(
      this.proyectoService.getProyectoById(this.proyectoActualId)
    );
    const proyectoDataActual = this.proyectoService.parsearData(proyectoActual.data);

    // 2. Procesar eventos
    const eventosProcesados = await Promise.all(
      this.timelineEvents.map(async (event) => {
        if (event.image && event.image.startsWith('data:image')) {
          try {
            const file = this.dataURLtoFile(event.image, `evento-${event.year}.png`);
            const respuesta = await lastValueFrom(
              this.archivoService.subirAssetProyectoUser(file, usuario.id, this.proyectoActualId!)
            );
            return {
              ...event,
              image: this.archivoService.obtenerUrlDesdeRespuesta(respuesta)
            };
          } catch (error) {
            console.error('Error subiendo imagen del evento:', error);
            return { ...event, image: '' };
          }
        }
        return event;
      })
    );

    // 3. Manejar portada
    let portadaUrl = proyectoDataActual.metadata?.portadaUrl || '';

    if (this.portadaArchivo) {
      // ✅ CORREGIDO: Eliminar portada anterior si existe
      if (portadaUrl) {
        await this.eliminarPortadaAnterior(portadaUrl, usuario.id);
      }

      // Subir nueva portada
      portadaUrl = await this.subirPortadaProyecto(usuario.id, this.proyectoActualId);
    }

    // 4. Preparar datos actualizados
    const proyectoData: ProyectoData = {
      metadata: {
        nombre: this.proyectoNombre,
        descripcion: this.proyectoDescripcion,
        fechaExportacion: new Date().toISOString(),
        version: '1.0',
        totalEventos: eventosProcesados.length,
        portadaUrl: portadaUrl
      },
      configuracion: {
        backgroundColor: this.backgroundColor,
        minYear: this.minYear,
        maxYear: this.maxYear,
        stageWidth: this.stage.width(),
        stageHeight: this.stage.height()
      },
      eventos: eventosProcesados,
      elementosKonva: this.serializarElementosKonva(),
      estilos: this.getEstilosBasicos()
    };

    const proyectoRequest: ProyectoRequest = {
      titulo: this.proyectoNombre,
      descripcion: this.proyectoDescripcion,
      data: this.proyectoService.serializarData(proyectoData),
      plantillaBaseId: plantillaId
    };

    const proyectoActualizado = await lastValueFrom(
      this.proyectoService.updateProyecto(this.proyectoActualId, proyectoRequest)
    );
    
    console.log('✅ Proyecto actualizado:', proyectoActualizado);
    this.mostrarMensaje('Proyecto actualizado correctamente');
    
    // Limpiar portada temporal
    this.portadaArchivo = null;
    
    // Refrescar la lista
    this.cargarMisProyectos();
    
  } catch (error) {
    console.error('❌ Error actualizando proyecto:', error);
    alert('Error al actualizar el proyecto');
  }
}

  async duplicarProyecto(id: number): Promise<void> {
    try {
      const proyectoDuplicado = await lastValueFrom(
        this.proyectoService.duplicarProyecto(id)
      );
      
      console.log('✅ Proyecto duplicado:', proyectoDuplicado);
      this.mostrarMensaje('Proyecto duplicado correctamente');
      
      // Refrescar la lista
      this.cargarMisProyectos();
      
    } catch (error) {
      console.error('❌ Error duplicando proyecto:', error);
      alert('Error al duplicar el proyecto');
    }
  }


  async eliminarProyecto(id: number, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await lastValueFrom(
        this.proyectoService.deleteProyecto(id)
      );
      
      console.log('✅ Proyecto eliminado:', id);
      this.mostrarMensaje('Proyecto eliminado correctamente');
      
      // Si era el proyecto actual, limpiar referencia
      if (this.proyectoActualId === id) {
        this.proyectoActualId = undefined;
      }
      
      // Refrescar la lista
      this.cargarMisProyectos();
      
    } catch (error) {
      console.error('❌ Error eliminando proyecto:', error);
      alert('Error al eliminar el proyecto');
    }
  }

  private async cargarProyectoDesdeData(proyectoData: ProyectoData, titulo: string, descripcion: string): Promise<void> {
  try {
    // 1. Establecer propiedades básicas
    this.proyectoNombre = titulo;
    this.proyectoDescripcion = descripcion;

    // 2. Cargar portada si existe
    if (proyectoData.metadata?.portadaUrl) {
      this.proyectoPortada = proyectoData.metadata.portadaUrl;
    } else {
      this.proyectoPortada = '';
    }
    this.portadaArchivo = null;

    this.crearElementosProyecto();

    // 3. Limpiar editor actual
    this.timelineEvents = [];
    this.limpiarEditorCompletamente();

    if (proyectoData.configuracion.lineaDeTiempo) {
      this.convertirLineaTiempoConfig(proyectoData.configuracion.lineaDeTiempo);
    }

    this.extraerYGuardarZonasDeEventos(proyectoData.eventos);

    // 4. Cargar configuración básica
    this.backgroundColor = proyectoData.configuracion.backgroundColor;
    this.minYear = proyectoData.configuracion.minYear;
    this.maxYear = proyectoData.configuracion.maxYear;

    // Redimensionar canvas según la configuración guardada
    if (proyectoData.configuracion.stageWidth && proyectoData.configuracion.stageHeight) {
      this.canvasWidth = proyectoData.configuracion.stageWidth;
      this.canvasHeight = proyectoData.configuracion.stageHeight;
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);
    }
    
    this.updateBackgroundColor(this.backgroundColor);

    if (proyectoData.configuracion.lineaDeTiempo) {
      this.convertirLineaTiempoConfig(proyectoData.configuracion.lineaDeTiempo);
    } 

    // 5. ✅ EXTRAER POSICIONES REALES de elementosKonva
    const posicionesReales = this.extraerPosicionesDeElementosKonva(proyectoData.elementosKonva);
    console.log('📍 Posiciones reales extraídas:', posicionesReales);

    // 6. Precargar imágenes antes de cargar eventos
    console.log('🖼️ Precargando imágenes del proyecto...');
    const eventosConImagenesCargadas = await this.preloadImagesForEvents(proyectoData.eventos);
    
    const eventosOrdenados = eventosConImagenesCargadas.sort((a, b) => {
      if (a.orden !== undefined && b.orden !== undefined) {
        return a.orden - b.orden;
      }
      if (a.orden !== undefined) return -1;
      if (b.orden !== undefined) return 1;
      return a.year - b.year;
    });

    // 7. ✅ ASIGNAR POSICIONES REALES A LOS EVENTOS
    this.timelineEvents = eventosOrdenados.map((evento, index) => {
      const eventoOriginal = proyectoData.eventos.find(e => 
        e.year === evento.year && e.title === evento.title
      );
      
      // ✅ USAR posicionReal si existe, sino usar posicionLibre, sino zonaDesign
      const posicionReal = posicionesReales[index];
      const posicionLibre = eventoOriginal?.posicionLibre;
      const posicionZona = (eventoOriginal as any)?.zonaDesign?.posicion;

      let posicionFinal;
      if (posicionReal) {
        posicionFinal = posicionReal;
        console.log(`✅ Evento ${index + 1} usando posición REAL de elementosKonva:`, posicionReal);
      } else if (posicionLibre) {
        posicionFinal = posicionLibre;
        console.log(`✅ Evento ${index + 1} usando posicionLibre:`, posicionLibre);
      } else if (posicionZona) {
        posicionFinal = posicionZona;
        console.log(`⚠️ Evento ${index + 1} usando posición de zona (fallback):`, posicionZona);
      }

      return {
        ...evento,
        zonaDesign: (eventoOriginal as any)?.zonaDesign || null,
        posicionLibre: posicionFinal || posicionZona, // ✅ Guardar la posición real
        orden: eventoOriginal?.orden ?? index
      };
    });
    
    // 8. Renderizar la línea de tiempo base
    console.log('📏 Renderizando línea de tiempo base...');
    this.renderTimelineBase();

    // 9. Cargar elementos decorativos
    if (proyectoData.elementosKonva && proyectoData.elementosKonva.length > 0) {
      console.log('🎨 Cargando elementos decorativos...');
      
      const elementos = proyectoData.elementosKonva as any[];
      
      for (const elemento of elementos) {
        // Saltar grupos de eventos (ya se renderizan con renderTimelineEvents)
        const esGrupoEvento = elemento.tipo === 'Group' && 
                             elemento.hijos && 
                             elemento.hijos.length > 0;
        
        if (!esGrupoEvento) {
          await this.crearElementoDesdeSerializacion(elemento);
        }
      }
    }

    // 10. Renderizar eventos con su diseño y posición real
    console.log('📍 Renderizando eventos con posiciones reales...');
    this.renderTimelineEvents();
    
    console.log('✅ Proyecto cargado completamente:', proyectoData.metadata.nombre);
    
  } catch (error) {
    console.error('❌ Error cargando proyecto desde JSON:', error);
    this.mostrarMensaje('Error al cargar el proyecto', 'error');
  }
}


private extraerYGuardarZonasDeEventos(eventos: TimelineEvent[]): void {
  this.zonasPlantilla = [];
  
  // Buscar los primeros N eventos que tengan zonaDesign
  const eventosConDiseno = eventos
    .filter(e => (e as any).zonaDesign)
    .slice(0, 3); // Tomar máximo 3 para el patrón
  
  if (eventosConDiseno.length === 0) {
    console.warn('⚠️ No se encontraron diseños en los eventos');
    return;
  }
  
  // Guardar cada diseño
  eventosConDiseno.forEach((evento, index) => {
    const zonaDesign = (evento as any).zonaDesign;
    
    // Crear una copia limpia del diseño
    const zonaBase = {
      id: zonaDesign.id || `zone-${index + 1}`,
      nombre: zonaDesign.nombre || `Diseño ${index + 1}`,
      posicion: { ...zonaDesign.posicion },
      elementos: JSON.parse(JSON.stringify(zonaDesign.elementos || [])),
      contenedor: { ...zonaDesign.contenedor },
      orden: index + 1
    };
    
    this.zonasPlantilla.push(zonaBase);
  });
  
  console.log(`✅ ${this.zonasPlantilla.length} zonas restauradas desde eventos existentes`);
}


private extraerPosicionesDeElementosKonva(elementosKonva: any[]): Array<{ x: number; y: number }> {
  const posiciones: Array<{ x: number; y: number }> = [];
  
  if (!elementosKonva || !Array.isArray(elementosKonva)) {
    return posiciones;
  }

  // Buscar solo los grupos que representan eventos (tienen hijos)
  const gruposEventos = elementosKonva.filter(elem => 
    elem.tipo === 'Group' && 
    elem.hijos && 
    elem.hijos.length > 0 &&
    elem.draggable === true // Los eventos son draggable
  );

  // Extraer posiciones en orden
  gruposEventos.forEach(grupo => {
    posiciones.push({
      x: grupo.x,
      y: grupo.y
    });
  });

  console.log(`📊 Extraídas ${posiciones.length} posiciones de grupos en elementosKonva`);
  return posiciones;
}




private async preloadImagesForEvents(eventos: TimelineEvent[]): Promise<TimelineEvent[]> {
  const eventosConImagenes = await Promise.all(
    eventos.map(async (evento) => {
      if (evento.image && this.esUrlExterna(evento.image)) {
        try {
          console.log(`🖼️ Precargando imagen para evento ${evento.year}:`, evento.image);
          const imageDataUrl = await this.convertUrlToDataURL(evento.image);
          return {
            ...evento,
            image: imageDataUrl // ✅ Usar data URL local para Konva
          };
        } catch (error) {
          console.error(`❌ Error precargando imagen para evento ${evento.year}:`, error);
          return { ...evento, image: '' }; // En caso de error, sin imagen
        }
      }
      return evento; // Mantener data URLs existentes
    })
  );
  
  console.log('✅ Todas las imágenes precargadas para eventos');
  return eventosConImagenes;
}

/**
 * ✅ NUEVO MÉTODO: Convertir URL externa a Data URL
 */
private async convertUrlToDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // ✅ Importante para CORS
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convertir a data URL
        const dataURL = canvas.toDataURL('image/png');
        console.log(`✅ URL convertida a data URL: ${url.substring(0, 50)}...`);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      console.error(`❌ Error cargando imagen: ${url}`);
      reject(new Error(`No se pudo cargar la imagen: ${url}`));
    };
    
    // ✅ Agregar timestamp para evitar cache
    const separator = url.includes('?') ? '&' : '?';
    img.src = url + separator + 't=' + Date.now();
  });
}


private recrearCompletamente(): void {
  // Guardar eventos actuales
  const eventosActuales = [...this.timelineEvents];
  
  // Recrear Konva completamente
  this.reiniciarKonva();
  
  // Restaurar eventos
  this.timelineEvents = eventosActuales;
  this.renderTimelineEvents();
}

private reiniciarKonva(): void {
  // Destruir completamente y recrear
  this.stage.destroy();
  this.initKonva();
}

  private cargarConfiguracionDiseno(configuracion: any): void {
  // Aplicar color de fondo de manera segura
  this.backgroundColor = configuracion.backgroundColor;
  this.actualizarFondoSeguro(this.backgroundColor);

  // Limpiar elementos de diseño de manera segura
  this.limpiarElementosDisenoSeguro();

  // Cargar elementos decorativos
  this.cargarElementosDecorativos(configuracion.elementos);
}

private limpiarElementosDisenoSeguro(): void {
  const elementosMantener = this.mainLayer.children?.filter(child => 
    this.esEventoDeLineaTiempo(child)
  ) || [];
  
  const elementosEliminar = this.mainLayer.children?.filter(child => 
    !this.esEventoDeLineaTiempo(child)
  ) || [];
  
  // Eliminar solo los elementos de diseño, no los de la línea de tiempo
  elementosEliminar.forEach(elemento => {
    this.eliminarElementoSeguro(elemento);
  });
  
  this.mainLayer.batchDraw();
}
private eliminarElementoSeguro(elemento: Konva.Node): void {
  try {
    // Remover transformer primero
    const transformer = elemento.getAttr('myTransformer');
    if (transformer && transformer instanceof Konva.Transformer) {
      transformer.remove();
    }
    
    // Remover el elemento
    elemento.remove();
    
  } catch (error) {
    console.warn('Error al eliminar elemento:', error);
    // Si falla, intentar destruir como último recurso
    try {
      elemento.destroy();
    } catch (destroyError) {
      console.error('Error incluso al destruir elemento:', destroyError);
    }
  }
}
seleccionarArchivoPlantilla(): void {
  const fileInput = document.getElementById('import-plantilla') as HTMLInputElement;
  if (fileInput) {
    fileInput.click();
  }
}


importarPlantillaDesdeArchivo(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  // Verificar que sea un archivo JSON
  if (!file.name.toLowerCase().endsWith('.json')) {
    alert('Por favor, selecciona un archivo JSON válido.');
    return;
  }

  const reader = new FileReader();
  
  reader.onload = (e: any) => {
    try {
      const plantillaJSON = JSON.parse(e.target.result);
      console.log('📄 JSON parseado:', plantillaJSON);
      
      // Verificar que tenga la estructura esperada
      if (!plantillaJSON.configuracionVisual || !plantillaJSON.configuracionVisual.zonasEventos) {
        throw new Error('El archivo no tiene la estructura de plantilla válida');
      }
      
      this.cargarPlantillaDesdeJSON(plantillaJSON);
      this.mostrarMensaje(`✅ Plantilla importada correctamente con ${plantillaJSON.configuracionVisual.zonasEventos.length} eventos`);
    } catch (error) {
      console.error('❌ Error parseando JSON:', error);
      alert('Error: El archivo no es una plantilla JSON válida.');
    }
  };

  reader.onerror = (error) => {
    console.error('❌ Error leyendo archivo:', error);
    alert('Error al leer el archivo.');
  };

  reader.readAsText(file);
  
  // Limpiar el input para permitir re-seleccionar el mismo archivo
  event.target.value = '';
}



private zonasPlantilla: any[] = [];

private cargarPlantillaDesdeJSON(plantillaJSON: any): void {
  try {
    console.log('📥 Cargando plantilla desde JSON...', plantillaJSON);

    // ✅ SOLO CARGAR CONFIGURACIÓN VISUAL, NO CREAR EVENTOS
    this.cargarConfiguracionVisual(plantillaJSON.configuracionVisual);
    this.limpiarPlantillaAnterior();
    this.limpiarCompletamenteLineaTiempo();
    
    if (plantillaJSON.configuracionVisual?.lineaDeTiempo) {
      console.log('🔧 Aplicando configuración de línea de tiempo...', plantillaJSON.configuracionVisual.lineaDeTiempo);
      this.convertirLineaTiempoConfig(plantillaJSON.configuracionVisual.lineaDeTiempo);
      console.log('🎨 Renderizando línea con diseño:', this.currentTimelineDesign.layout.type);
      this.renderTimelineBase();
    }
    
    if (plantillaJSON.configuracionVisual.elementosDecorativos) {
      this.cargarElementosDecorativos(plantillaJSON.configuracionVisual.elementosDecorativos);
    }
    
    // ✅ CRÍTICO: GUARDAR LAS ZONAS PERO NO CREAR EVENTOS AUTOMÁTICAMENTE
    if (plantillaJSON.configuracionVisual.zonasEventos) {
      this.guardarZonasPlantilla(plantillaJSON.configuracionVisual.zonasEventos);
    }
    
    if (plantillaJSON.nombre) {
      this.proyectoNombre = plantillaJSON.nombre;
    }
    if (plantillaJSON.descripcion) {
      this.proyectoDescripcion = plantillaJSON.descripcion;
    }

    // ✅ NO renderizar eventos automáticamente
    // this.renderTimelineEvents();
    
    console.log('✅ Plantilla cargada correctamente (sin eventos)');
    console.log('📊 Diseño actual:', {
      id: this.currentTimelineDesign.id,
      tipo: this.currentTimelineDesign.layout.type,
      positionY: this.currentTimelineDesign.layout.positionY,
      amplitude: this.currentTimelineDesign.layout.amplitude
    });
    
    //this.mostrarMensaje('✅ Plantilla cargada. Ahora puedes agregar eventos.');
    
  } catch (error) {
    console.error('❌ Error cargando plantilla:', error);
    this.mostrarMensaje('Error al cargar la plantilla', 'error');
  }
}

private guardarZonasPlantilla(zonas: any[]): void {
  // ✅ SOLO GUARDAR LAS ZONAS PARA USO FUTURO, NO CREAR EVENTOS
  this.zonasPlantilla = [...zonas];
  //console.log(`💾 Zonas de plantilla guardadas: ${this.zonasPlantilla.length} zonas`);
  
  // Limpiar eventos existentes
  this.timelineEvents = [];
  
  //console.log('✅ Plantilla lista. Los eventos aparecerán cuando el usuario los agregue.');
}




private cargarConfiguracionLineaTiempo(lineaConfig: any): void {
  try {
    //console.log('📈 Cargando configuración de línea de tiempo:', lineaConfig);
    
    // Buscar un diseño de timeline que coincida con el tipo
    const diseñoCoincidente = this.timelineDesigns.find(design => 
      design.layout.type === lineaConfig.tipo
    );
    
    if (diseñoCoincidente) {
      this.currentTimelineDesign = diseñoCoincidente;
      this.selectedTimelineDesignId = diseñoCoincidente.id;
      
      // Aplicar estilo personalizado si existe
      if (lineaConfig.estilo) {
        this.aplicarEstiloLineaTiempo(lineaConfig.estilo);
      }
      
      // Aplicar propiedades específicas del tipo
      this.aplicarPropiedadesLineaTiempo(lineaConfig);
      
      console.log(`✅ Configuración de línea aplicada: ${lineaConfig.tipo}`);
    } else {
      console.warn(`⚠️ No se encontró diseño para tipo: ${lineaConfig.tipo}, usando por defecto`);
      // Usar diseño por defecto pero aplicar la configuración
      this.aplicarConfiguracionLineaPersonalizada(lineaConfig);
    }
    
  } catch (error) {
    console.error('❌ Error cargando configuración de línea:', error);
  }
}


private aplicarEstiloLineaTiempo(estilo: any): void {
  // Actualizar el diseño actual con el estilo de la plantilla
  this.currentTimelineDesign = {
    ...this.currentTimelineDesign,
    lineStyle: {
      ...this.currentTimelineDesign.lineStyle,
      stroke: estilo.stroke || this.currentTimelineDesign.lineStyle.stroke,
      strokeWidth: estilo.strokeWidth || this.currentTimelineDesign.lineStyle.strokeWidth,
      lineCap: (estilo.lineCap as any) || this.currentTimelineDesign.lineStyle.lineCap
    }
  };
}

private aplicarPropiedadesLineaTiempo(lineaConfig: any): void {
  // Actualizar propiedades de posición según la configuración
  if (lineaConfig.positionX !== undefined || lineaConfig.positionY !== undefined) {
    this.currentTimelineDesign = {
      ...this.currentTimelineDesign,
      layout: {
        ...this.currentTimelineDesign.layout,
        // ✅ AGREGADO: Guardar posiciones exactas para todos los tipos
        positionX: lineaConfig.positionX,
        positionY: lineaConfig.positionY,
        // Para líneas horizontales, usar positionY
        ...(lineaConfig.tipo === 'horizontal' && lineaConfig.positionY !== undefined && {
          orientation: this.calcularOrientacionDesdePosicionY(lineaConfig.positionY)
        }),
        // Para líneas verticales, usar positionX
        ...(lineaConfig.tipo === 'vertical' && lineaConfig.positionX !== undefined && {
          orientation: this.calcularOrientacionDesdePosicionX(lineaConfig.positionX)
        }),
        // Para líneas curvas y onduladas
        ...(lineaConfig.tipo === 'curve' && {
          curvature: this.calcularCurvaturaDesdeConfig(lineaConfig)
        }),
        ...(lineaConfig.tipo === 'wave' && {
          amplitude: lineaConfig.intensity || 30,
          frequency: lineaConfig.frequency || 0.02,
          positionY: lineaConfig.positionY // ✅ CRÍTICO para wave
        }),
        ...(lineaConfig.tipo === 'zigzag' && {
          amplitude: lineaConfig.intensity || 40,
          segments: 20
        }),
        ...(lineaConfig.tipo === 'spiral' && {
          segments: Math.round((lineaConfig.turns || 3) * 12) // Convertir vueltas a segmentos
        }),
        ...(lineaConfig.tipo === 's-curve' && {
          amplitude: lineaConfig.intensity || 40,
          segments: 20,
          intensitycurva: lineaConfig.intensitycurva || 100,
          anchoTotal: lineaConfig.anchoTotal || 1110
        })
        
      }
    };
  }
}

private calcularOrientacionDesdePosicionY(positionY: number): "top" | "bottom" | "center" {
  if (positionY < 33) return "top";
  if (positionY > 66) return "bottom";
  return "center";
}

/**
 * ✅ Calcular orientación desde posición X (para líneas verticales)
 */
private calcularOrientacionDesdePosicionX(positionX: number): "left" | "right" | "center" {
  if (positionX < 33) return "left";
  if (positionX > 66) return "right";
  return "center";
}

/**
 * ✅ Calcular curvatura desde configuración
 */
private calcularCurvaturaDesdeConfig(lineaConfig: any): number {
  // Convertir posición Y a curvatura (0.1 a 0.5)
  const stageHeight = this.stage.height();
  const centerY = stageHeight / 2;
  const deviation = Math.abs(lineaConfig.positionY - centerY);
  return Math.min(0.5, deviation / stageHeight * 2);
}

/**
 * ✅ Aplicar configuración personalizada cuando no hay diseño coincidente
 */
private aplicarConfiguracionLineaPersonalizada(lineaConfig: any): void {
  // Crear un diseño personalizado basado en la configuración
  const diseñoPersonalizado: TimelineDesign = {
    id: 'custom-from-template',
    name: `Personalizado - ${lineaConfig.tipo}`,
    description: 'Diseño cargado desde plantilla',
    layout: {
      type: lineaConfig.tipo as any,
      orientation: 'center'
    },
    lineStyle: {
      stroke: lineaConfig.estilo?.stroke || '#070707ff',
      strokeWidth: lineaConfig.estilo?.strokeWidth || 5,
      strokeStyle: 'solid',
      lineCap: (lineaConfig.estilo?.lineCap as any) || 'round',
      shadow: {
        color: 'rgba(0,0,0,0.3)',
        blur: 8,
        offset: { x: 0, y: 3 },
        opacity: 0.5
      }
    },
    markers: [
      {
        type: 'year',
        position: 'both',
        interval: 10,
        style: {
          size: 4,
          color: lineaConfig.estilo?.stroke || '#070707ff',
          shape: 'line',
          label: {
            show: true,
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#2c3e50',
            position: 'outside'
          }
        }
      }
    ]
  };

  this.currentTimelineDesign = diseñoPersonalizado;
  this.selectedTimelineDesignId = 'custom-from-template';
}




private configurarZonasEventos(zonas: any[]): void {
  // Limpiar eventos existentes
  this.timelineEvents = [];
  
  // Crear eventos basados en las zonas de la plantilla
  zonas.forEach((zona, index) => {
    this.crearEventoDesdeZona(zona, index + 1);
  });

  // Recalcular el rango de años basado en los eventos reales
  this.calculateYearRange();
  
  console.log(`✅ Cargadas ${this.timelineEvents.length} zonas como eventos`);
}

private crearEventoDesdeZona(zona: any, orden: number): void {
  // Extraer información real de los elementos de la zona
  const elementos = zona.elementos || [];
  
  // Buscar los textos en los elementos de la zona
  let titulo = `Evento ${orden}`;
  let fechaTexto = '2024'; // Valor por defecto
  let descripcion = 'Descripción del evento...';
  let person = '';
  let link = '';
  let imagenUrl = '';
  const elementoImagen = elementos.find((elem: any) => elem.tipo === 'imagen');
  if (elementoImagen && elementoImagen.configuracion?.src) {
    imagenUrl = elementoImagen.configuracion.src;
  }

   elementos.forEach((elemento: any) => {
    if (elemento.configuracion && elemento.configuracion.texto) {
      switch (elemento.tipo) {
        case 'titulo':
          if (elemento.configuracion.texto === 'Título del evento') {
            titulo = `Evento ${orden}`;
          } else {
            titulo = elemento.configuracion.texto;
          }
          break;
        case 'fecha':
          fechaTexto = elemento.configuracion.texto || '2024';
          break;
        case 'descripcion':
          if (elemento.configuracion.texto === 'Descripción del evento...') {
            descripcion = '';
          } else {
            descripcion = elemento.configuracion.texto;
          }
          break;
        case 'personaje':
          if(elemento.configuracion.texto==='personaje'){
            person='';
          }else{
            person=elemento.configuracion.texto;
          }
          break;
        

        case 'link':
          // ✅ CAPTURAR EL TEXTO DEL LINK SI EXISTE
          if (elemento.configuracion.texto && 
              elemento.configuracion.texto !== 'Enlace' && 
              elemento.configuracion.texto !== 'Más información') {
            link = elemento.configuracion.texto;
          }
          break;
      }
    }
  });

  // Convertir la fecha a número (año)
  let year = this.calcularAnioPorOrden(orden);
  if (fechaTexto && !isNaN(Number(fechaTexto))) {
    year = Number(fechaTexto);
  } else if (fechaTexto === '2024') {
    // Si es el placeholder, usar el año calculado
    year = this.calcularAnioPorOrden(orden);
  }

  const evento: TimelineEvent = {
    year: year,
    title: titulo,
    person: person,
    description: descripcion,
    image: imagenUrl,
    link: link
  };
  
  // Guardar información de diseño de la zona
  evento['zonaDesign'] = {
    id: zona.id,
    nombre: zona.nombre,
    posicion: zona.posicion,
    elementos: this.limpiarPlaceholdersDeElementos(zona.elementos, evento), // ← LIMPIAR PLACEHOLDERS
    contenedor: zona.contenedor
  };
  
  this.timelineEvents.push(evento);
  console.log(`✅ Evento creado: ${titulo} (${year})`);
}

private limpiarPlaceholdersDeElementos(elementos: any[], evento: TimelineEvent): any[] {
  return elementos.map(elemento => {
    if (elemento.configuracion && elemento.configuracion.texto) {
      const nuevoElemento = { ...elemento };
      
      switch (elemento.tipo) {
        case 'titulo':
          if (elemento.configuracion.texto === 'Título del evento') {
            nuevoElemento.configuracion = {
              ...elemento.configuracion,
              texto: evento.title // Usar el título real del evento
            };
          }
          break;
          
        case 'fecha':
          if (elemento.configuracion.texto === '2024') {
            nuevoElemento.configuracion = {
              ...elemento.configuracion,
              texto: evento.year.toString() // Usar el año real del evento
            };
          }
          break;
          
        case 'descripcion':
          if (elemento.configuracion.texto === 'Descripción del evento...') {
            nuevoElemento.configuracion = {
              ...elemento.configuracion,
              texto: evento.description // Usar la descripción real
            };
          }
          break;
        case 'link': // ← NUEVO: Manejar placeholders de enlaces
          if (elemento.configuracion.texto === 'Enlace' || elemento.configuracion.texto === '🔗 Ver más') {
            nuevoElemento.configuracion = {
              ...elemento.configuracion,
              texto: evento.link ? 'Ver más' : 'Agregar enlace...'
            };
          }
          break;
      }
      
      return nuevoElemento;
    }
    
    return elemento;
  });
}

/**
 * ✅ NUEVO: Dibujar línea en S (S-Curve)
 */
private drawSCurveTimeline(): void {
  const layout = this.currentTimelineDesign.layout;
  const lineStyle = this.currentTimelineDesign.lineStyle;
  
  const centerX = (layout.positionX || this.stage.width() / 2) + 100;
  const centerY = layout.positionY || this.stage.height() / 2;
  const curveHeight = (layout.intensitycurva || 100) * 2;
  const cornerRadius = 20;
  
  const totalWidth = layout.anchoTotal || 1110;
  const halfWidth = totalWidth / 2;

  const startX = centerX - halfWidth;
  const endX = centerX + halfWidth;

  const sCurve = new Konva.Shape({
    id: 'timeline-base',
    sceneFunc: (context, shape) => {
      context.beginPath();

      const punto1X = startX + totalWidth * 0.7;
      context.moveTo(startX, centerY - curveHeight);
      context.lineTo(punto1X, centerY - curveHeight);

      context.arcTo(
        punto1X + cornerRadius * 2, centerY - curveHeight,
        punto1X + cornerRadius * 2, centerY - curveHeight + cornerRadius * 2,
        cornerRadius
      );

      const bajadaY = centerY - cornerRadius;
      context.lineTo(punto1X + cornerRadius * 2, bajadaY);

      context.arcTo(
        punto1X + cornerRadius * 2, centerY,
        punto1X + cornerRadius, centerY,
        cornerRadius
      );

      const punto2X = startX + totalWidth * 0.05;
      context.lineTo(punto2X, centerY);

      context.arcTo(
        punto2X - cornerRadius * 2, centerY,
        punto2X - cornerRadius * 2, centerY + cornerRadius,
        cornerRadius
      );

      const subidaY = centerY + curveHeight - cornerRadius;
      context.lineTo(punto2X - cornerRadius * 2, subidaY);

      context.arcTo(
        punto2X - cornerRadius * 2, centerY + curveHeight,
        punto2X - cornerRadius, centerY + curveHeight,
        cornerRadius
      );

      context.lineTo(endX * 0.77, centerY + curveHeight);
      
      context.strokeShape(shape);
    },
    stroke: lineStyle.stroke,
    strokeWidth: lineStyle.strokeWidth,
    lineCap: lineStyle.lineCap as any,
    lineJoin: 'round',
    shadowColor: lineStyle.shadow?.color,
    shadowBlur: lineStyle.shadow?.blur,
    shadowOffset: lineStyle.shadow?.offset,
    shadowOpacity: lineStyle.shadow?.opacity
  });

  this.mainLayer.add(sCurve);
}

/**
 * ✅ NUEVO: Línea personalizada/libre (Custom)
 */
private drawCustomTimeline(): void {
  // Para líneas personalizadas, no dibujar nada automáticamente
  // El usuario/admin debe haber definido los elementos manualmente
  console.log('📝 Modo línea personalizada - sin dibujo automático');
}



private calcularAnioPorOrden(orden: number): number {
  // Distribuir años equitativamente entre minYear y maxYear
  const totalEventos = this.timelineEvents.length;
  const rango = this.maxYear - this.minYear;
  return this.minYear + Math.round((orden - 1) * (rango / Math.max(1, totalEventos - 1)));
}


private cargarConfiguracionVisual(configuracion: any): void {
  this.canvasWidth = configuracion.canvasWidth;
  this.canvasHeight = configuracion.canvasHeight;
  this.backgroundColor = configuracion.backgroundColor;
  
  this.stage.width(this.canvasWidth);
  this.stage.height(this.canvasHeight);
  this.updateBackgroundColor(this.backgroundColor);
  
}





private actualizarFondoSeguro(color: string): void {
  // Encontrar el rectángulo de fondo existente
  const fondoExistente = this.backgroundLayer.findOne('#background');
  
  if (fondoExistente && fondoExistente instanceof Konva.Rect) {
    // Actualizar el color del fondo existente
    fondoExistente.fill(color);
  } else {
    // Crear nuevo fondo si no existe
    this.crearNuevoFondo(color);
  }
  
  this.backgroundLayer.batchDraw();
}
private crearNuevoFondo(color: string): void {
  const background = new Konva.Rect({
    id: 'background',
    x: 0,
    y: 0,
    width: this.stage.width(),
    height: this.stage.height(),
    fill: color,
    listening: false
  });

  this.backgroundLayer.add(background);
  this.backgroundLayer.moveToBottom();
}

  private limpiarElementosDiseno(): void {
  const elementosAEliminar: Konva.Node[] = [];
  
  // Primero recolectar los elementos a eliminar
  this.mainLayer.children?.forEach((child: Konva.Node) => {
    if (!(child instanceof Konva.Line) && !this.esEventoDeLineaTiempo(child)) {
      elementosAEliminar.push(child);
    }
  });
  
  // Luego eliminarlos de manera segura
  elementosAEliminar.forEach(child => {
    child.remove(); // ← USAR remove() EN LUGAR DE destroy()
  });
  
  this.mainLayer.batchDraw();
}

  private esEventoDeLineaTiempo(node: Konva.Node): boolean {
    // Verificar si el nodo es parte de un evento de línea de tiempo
    return node.getAttr('esEvento') === true;
  }

  /*private cargarElementosDecorativos(elementos: any[]): void {
    elementos.forEach(elemento => {
      this.crearElementoDesdeSerializacion(elemento);
    });
    this.mainLayer.batchDraw();
  }*/

  private cargarElementosDecorativos(elementos: any[]): void {
  elementos.forEach(elemento => {
    if (elemento.tipo === 'line' && elemento.id === 'decor-1') {
      this.crearLineaPrincipal(elemento);
    } else {
      // Si no existe crearElementoDecorativo, crea uno básico o elimina esta línea
      this.crearElementoDecorativoBasico(elemento);
    }
  });
}


private crearElementoDecorativoBasico(elemento: any): void {
  try {
    const konvaElement = elemento.konvaElement;
    
    switch (konvaElement.tipo) {
      case 'Line':
        const line = new Konva.Line({
          points: konvaElement.points,
          stroke: konvaElement.stroke,
          strokeWidth: konvaElement.strokeWidth,
          lineCap: konvaElement.lineCap as any,
          listening: false
        });
        this.mainLayer.add(line);
        break;
        
      case 'Group':
        // Para grupos, crear un grupo básico
        const group = new Konva.Group({
          x: konvaElement.x,
          y: konvaElement.y,
          scaleX: konvaElement.scaleX,
          scaleY: konvaElement.scaleY,
          rotation: konvaElement.rotation,
          listening: false
        });
        this.mainLayer.add(group);
        break;
        
      default:
        console.warn('Tipo de elemento decorativo no manejado:', konvaElement.tipo);
    }
  } catch (error) {
    console.error('Error creando elemento decorativo:', error);
  }
}


private crearLineaPrincipal(elemento: any): void {
  const konvaElement = elemento.konvaElement;
  
  const linea = new Konva.Line({
    id: 'linea-principal',
    points: konvaElement.points,
    stroke: konvaElement.stroke,
    strokeWidth: konvaElement.strokeWidth,
    lineCap: konvaElement.lineCap as any,
    x: konvaElement.x,
    y: konvaElement.y,
    scaleX: konvaElement.scaleX,
    scaleY: konvaElement.scaleY,
    rotation: konvaElement.rotation,
    listening: false // No interactiva
  });
  
  this.mainLayer.add(linea);
  this.mainLayer.batchDraw();
}

  private async crearElementoDesdeSerializacion(elemento: any): Promise<void> {
  switch (elemento.tipo) {
    case 'Rect':
      this.crearRectDesdeSerializacion(elemento);
      break;
    case 'Circle':
      this.crearCircleDesdeSerializacion(elemento);
      break;
    case 'Text':
      this.crearTextDesdeSerializacion(elemento);
      break;
    case 'Image':
      await this.crearImageDesdeSerializacionConCarga(elemento); // ✅ Ahora es async
      break;
    case 'Group':
      await this.crearGroupDesdeSerializacionConImagenes(elemento); // ✅ Ahora es async
      break;
  }
}


private async crearImageDesdeSerializacionConCarga(elemento: any): Promise<void> {
  return new Promise((resolve) => {
    // ✅ Preferir imageUrl, usar imageData como fallback
    const imageUrl = elemento.imageUrl || elemento.imageData;
    
    if (!imageUrl) {
      console.warn('No hay URL de imagen para cargar');
      this.crearPlaceholderEnPosicion(elemento);
      resolve();
      return;
    }

    const imageObj = new Image();
    
    // ✅ Configurar CORS solo para URLs externas
    if (this.esUrlExterna(imageUrl)) {
      imageObj.crossOrigin = 'Anonymous';
    }
    
    imageObj.onload = () => {
      const image = new Konva.Image({
        x: elemento.x,
        y: elemento.y,
        image: imageObj,
        width: elemento.width,
        height: elemento.height,
        draggable: true,
        scaleX: elemento.scaleX || 1,
        scaleY: elemento.scaleY || 1,
        rotation: elemento.rotation || 0,
        cornerRadius: elemento.cornerRadius || 0
      });

      // Aplicar sombra si existe
      if (elemento.shadow) {
        image.shadowColor(elemento.shadow.color || 'black');
        image.shadowBlur(elemento.shadow.blur || 5);
        image.shadowOffset(elemento.shadow.offset || { x: 3, y: 3 });
        image.shadowOpacity(elemento.shadow.opacity || 0.6);
      }

      // ✅ Guardar referencia a la URL original Y la imagen cargada
      image.setAttr('imageSrc', imageUrl);
      image.setAttr('loadedImage', imageObj); // Guardar referencia directa

      this.mainLayer.add(image);
      this.configurarInteracciones(image);
      this.mainLayer.draw();
      resolve();
    };

    imageObj.onerror = () => {
      console.error('Error al cargar la imagen:', imageUrl);
      this.crearPlaceholderEnPosicion(elemento);
      resolve();
    };

    imageObj.src = imageUrl;
  });
}

/**
 * ✅ NUEVO MÉTODO: Crear grupo con imágenes cargadas
 */
private async crearGroupDesdeSerializacionConImagenes(elemento: any): Promise<void> {
  const group = new Konva.Group({
    x: elemento.x,
    y: elemento.y,
    draggable: true,
    scaleX: elemento.scaleX || 1,
    scaleY: elemento.scaleY || 1,
    rotation: elemento.rotation || 0
  });

  // Recrear todos los hijos del grupo
  if (elemento.children && Array.isArray(elemento.children)) {
    for (const childElemento of elemento.children) {
      if (childElemento.tipo === 'Image') {
        await this.agregarImagenAGrupo(group, childElemento);
      } else {
        const childNode = this.crearNodoParaGrupo(childElemento);
        if (childNode) {
          childNode.x(childElemento.relativeX || 0);
          childNode.y(childElemento.relativeY || 0);
          group.add(childNode);
        }
      }
    }
  }

  // Aplicar clipping si existe
  if (elemento.clip) {
    this.aplicarClippingGrupo(group, elemento.clip);
  }

  this.mainLayer.add(group);
  this.configurarInteracciones(group);
}











/**
 * ✅ ZOOM IN - Aumentar zoom
 */
zoomIn(): void {
  const newZoom = this.zoomLevel + this.zoomStep;
  if (newZoom <= this.maxZoom) {
    this.applyZoom(newZoom);
  }
}

/**
 * ✅ ZOOM OUT - Disminuir zoom
 */
zoomOut(): void {
  const newZoom = this.zoomLevel - this.zoomStep;
  if (newZoom >= this.minZoom) {
    this.applyZoom(newZoom);
  }
}

/**
 * ✅ SET ZOOM - Establecer zoom específico
 */
setZoom(event: any): void {
  const newZoom = parseInt(event.target.value);
  this.applyZoom(newZoom);
}

/**
 * ✅ RESET ZOOM - Volver al 100%
 */
resetZoom(): void {
  this.applyZoom(100);
}

/**
 * ✅ APLICAR ZOOM - Método principal que aplica la transformación
 */
private applyZoom(zoomLevel: number): void {
  const oldZoom = this.zoomLevel;
  const newZoom = zoomLevel;
  
  // Calcular el factor de escala
  const oldScale = oldZoom / 100;
  const newScale = newZoom / 100;
  
  // Obtener la posición actual del stage y el puntero
  const stage = this.stage;
  const stageContainer = stage.container();
  const containerRect = stageContainer.getBoundingClientRect();
  
  // Calcular el centro del contenedor (punto de anclaje para el zoom)
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  // Convertir las coordenadas del puntero (centro) a coordenadas del stage
  const pointerPos = {
    x: (centerX - stage.x()) / oldScale,
    y: (centerY - stage.y()) / oldScale
  };
  
  // Calcular la nueva posición para mantener el punto centrado
  const newPos = {
    x: centerX - pointerPos.x * newScale,
    y: centerY - pointerPos.y * newScale
  };
  
  // Aplicar la nueva escala y posición
  stage.scale({ x: newScale, y: newScale });
  stage.position(newPos);
  
  // Actualizar el nivel de zoom
  this.zoomLevel = newZoom;
  
  // Re-dibujar todo
  stage.batchDraw();
  

}

/**
 * ✅ ZOOM TO FIT - Ajustar al área visible (como Figma)
 */
zoomToFit(): void {
  // Calcular el zoom que hace que todo el contenido sea visible
  const contentBounds = this.getContentBounds();
  const stageWidth = this.stage.width();
  const stageHeight = this.stage.height();
  
  const scaleX = stageWidth / contentBounds.width;
  const scaleY = stageHeight / contentBounds.height;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% para dejar margen
  
  const zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, Math.round(scale * 100)));
  this.applyZoom(zoomLevel);
}

/**
 * ✅ Obtener los límites de todo el contenido
 */
private getContentBounds(): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  this.mainLayer.children?.forEach((node: Konva.Node) => {
    const pos = node.getClientRect();
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  });
  
  return {
    width: maxX - minX,
    height: maxY - minY
  };
}


/**
 * ✅ Zoom con rueda del mouse (Ctrl + Scroll)
 */
private setupMouseWheelZoom(): void {
  this.stage.content.addEventListener('wheel', (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
      const newZoom = this.zoomLevel + delta;
      
      if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
        this.applyZoom(newZoom);
      }
    }
  });
}



/**
 * ✅ NUEVO MÉTODO: Agregar imagen a grupo de manera asíncrona
 */
private async agregarImagenAGrupo(group: Konva.Group, elemento: any): Promise<void> {
  return new Promise((resolve) => {
    const imageUrl = elemento.imageUrl || elemento.imageData;
    
    if (!imageUrl) {
      resolve();
      return;
    }

    const imageObj = new Image();
    
    if (this.esUrlExterna(imageUrl)) {
      imageObj.crossOrigin = 'Anonymous';
    }
    
    imageObj.onload = () => {
      const konvaImage = new Konva.Image({
        x: elemento.relativeX || 0,
        y: elemento.relativeY || 0,
        image: imageObj,
        width: elemento.width,
        height: elemento.height,
        cornerRadius: elemento.cornerRadius || 0
      });

      // Guardar referencia
      konvaImage.setAttr('imageSrc', imageUrl);
      konvaImage.setAttr('loadedImage', imageObj);

      group.add(konvaImage);
      resolve();
    };

    imageObj.onerror = () => {
      console.error('Error cargando imagen en grupo:', imageUrl);
      resolve();
    };

    imageObj.src = imageUrl;
  });
}


private esUrlExterna(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}


  private crearRectDesdeSerializacion(elemento: any): void {
    const rect = new Konva.Rect({
      x: elemento.x,
      y: elemento.y,
      width: elemento.width,
      height: elemento.height,
      fill: elemento.fill,
      stroke: elemento.stroke,
      strokeWidth: elemento.strokeWidth,
      cornerRadius: elemento.cornerRadius,
      draggable: true
    });
    
    this.mainLayer.add(rect);
    this.configurarInteracciones(rect);
  }

  private crearCircleDesdeSerializacion(elemento: any): void {
  const circle = new Konva.Circle({
    x: elemento.x,
    y: elemento.y,
    radius: elemento.radius,
    fill: elemento.fill,
    stroke: elemento.stroke,
    strokeWidth: elemento.strokeWidth,
    draggable: true,
    scaleX: elemento.scaleX || 1,
    scaleY: elemento.scaleY || 1,
    rotation: elemento.rotation || 0
  });

  this.mainLayer.add(circle);
  this.configurarInteracciones(circle);

  // Si es un círculo con imagen (grupo), recrear la estructura completa
  if (elemento.esCirculoConImagen) {
    this.recrearCirculoConImagen(circle, elemento);
  }
}

private recrearCirculoConImagen(circleBase: Konva.Circle, elemento: any): void {
  const group = new Konva.Group({
    x: elemento.x,
    y: elemento.y,
    draggable: true,
    scaleX: elemento.scaleX || 1,
    scaleY: elemento.scaleY || 1,
    rotation: elemento.rotation || 0
  });

  // Cargar la imagen si existe
  if (elemento.imagenUrl) {
    const imageObj = new Image();
    imageObj.crossOrigin = 'Anonymous';
    imageObj.src = elemento.imagenUrl;

    imageObj.onload = () => {
      const radius = elemento.radius;
      const konvaImage = new Konva.Image({
        x: -radius,
        y: -radius,
        image: imageObj,
        width: radius * 2,
        height: radius * 2,
      });

      // Aplicar clipping circular
      group.clipFunc((ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        ctx.closePath();
      });

      group.add(konvaImage);

      // Crear el borde
      const circleBorder = new Konva.Circle({
        x: 0,
        y: 0,
        radius: radius,
        stroke: elemento.stroke,
        strokeWidth: elemento.strokeWidth,
        fill: 'transparent',
      });

      group.add(circleBorder);
      this.mainLayer.add(group);
      
      // Eliminar el círculo base temporal
      circleBase.destroy();
      
      this.configurarInteracciones(group);
      this.mainLayer.draw();
    };

    imageObj.onerror = () => {
      console.error('Error al cargar la imagen del círculo:', elemento.imagenUrl);
      // Mantener el círculo simple si falla la imagen
      this.configurarInteracciones(circleBase);
    };
  }
}

   abrirSelectorPlantillasDiseno(): void {
    this.showDesignTemplatesModal = true;
    this.cargarPlantillasDiseno();
  }


  private crearTextDesdeSerializacion(elemento: any): void {
  const text = new Konva.Text({
    x: elemento.x,
    y: elemento.y,
    text: elemento.text,
    fontSize: elemento.fontSize,
    fontFamily: elemento.fontFamily,
    fill: elemento.fill,
    draggable: true,
    scaleX: elemento.scaleX || 1,
    scaleY: elemento.scaleY || 1,
    rotation: elemento.rotation || 0,
    width: elemento.width, // Para texto con width específico
    height: elemento.height, // Para texto con height específico
    align: elemento.align || 'left',
    verticalAlign: elemento.verticalAlign || 'top',
    padding: elemento.padding || 0,
    lineHeight: elemento.lineHeight || 1
  });

  // Aplicar sombra si existe
  if (elemento.shadow) {
    text.shadowColor(elemento.shadow.color || 'black');
    text.shadowBlur(elemento.shadow.blur || 5);
    text.shadowOffset(elemento.shadow.offset || { x: 3, y: 3 });
    text.shadowOpacity(elemento.shadow.opacity || 0.6);
  }

  this.mainLayer.add(text);
  this.configurarInteracciones(text);
}



private crearImageDesdeSerializacion(elemento: any): void {
  // ✅ MODIFICACIÓN: Preferir imageUrl, usar imageData como fallback
  const imageUrl = elemento.imageUrl || elemento.imageData;
  
  if (!imageUrl) {
    console.warn('No hay URL de imagen para cargar');
    return;
  }

  const imageObj = new Image();
  imageObj.crossOrigin = 'Anonymous'; // ✅ Importante para CORS
  
  // Si es data URL, no necesita CORS
  if (imageUrl.startsWith('data:')) {
    imageObj.crossOrigin = null;
  }
  
  imageObj.src = imageUrl;

  imageObj.onload = () => {
    const image = new Konva.Image({
      x: elemento.x,
      y: elemento.y,
      image: imageObj,
      width: elemento.width,
      height: elemento.height,
      draggable: true,
      scaleX: elemento.scaleX || 1,
      scaleY: elemento.scaleY || 1,
      rotation: elemento.rotation || 0,
      cornerRadius: elemento.cornerRadius || 0
    });

    // Aplicar sombra si existe
    if (elemento.shadow) {
      image.shadowColor(elemento.shadow.color || 'black');
      image.shadowBlur(elemento.shadow.blur || 5);
      image.shadowOffset(elemento.shadow.offset || { x: 3, y: 3 });
      image.shadowOpacity(elemento.shadow.opacity || 0.6);
    }

    // Guardar referencia a la URL original
    image.setAttr('imageSrc', imageUrl);

    this.mainLayer.add(image);
    this.configurarInteracciones(image);
    this.mainLayer.draw();
  };

  imageObj.onerror = () => {
    console.error('Error al cargar la imagen:', imageUrl);
    this.crearPlaceholderEnPosicion(elemento);
  };
}


private crearPlaceholderEnPosicion(elemento: any): void {
  const placeholder = new Konva.Rect({
    x: elemento.x,
    y: elemento.y,
    width: elemento.width,
    height: elemento.height,
    fill: '#f0f0f0',
    stroke: '#ccc',
    strokeWidth: 1,
    draggable: true
  });

  const errorText = new Konva.Text({
    x: elemento.x,
    y: elemento.y + elemento.height / 2 - 10,
    text: '❌ Imagen no disponible',
    fontSize: 12,
    fontFamily: 'Arial',
    fill: '#666',
    width: elemento.width,
    align: 'center'
  });

  this.mainLayer.add(placeholder);
  this.mainLayer.add(errorText);
  this.configurarInteracciones(placeholder);
  this.mainLayer.draw();
}


private crearGroupDesdeSerializacion(elemento: any): void {
  const group = new Konva.Group({
    x: elemento.x,
    y: elemento.y,
    draggable: true,
    scaleX: elemento.scaleX || 1,
    scaleY: elemento.scaleY || 1,
    rotation: elemento.rotation || 0
  });

  // Recrear todos los hijos del grupo
  if (elemento.children && Array.isArray(elemento.children)) {
    elemento.children.forEach((childElemento: any) => {
      const childNode = this.crearNodoParaGrupo(childElemento);
      if (childNode) {
        // Restaurar posición relativa
        childNode.x(childElemento.relativeX || 0);
        childNode.y(childElemento.relativeY || 0);
        group.add(childNode);
      }
    });
  }

  // Aplicar clipping si existe (aproximación mejorada)
  if (elemento.clip) {
    this.aplicarClippingGrupo(group, elemento.clip);
  }

  this.mainLayer.add(group);
  this.configurarInteracciones(group);
}
private aplicarClippingGrupo(group: Konva.Group, clip: any): void {
  if (clip.type === 'circle') {
    group.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(
        clip.x || 0,
        clip.y || 0,
        clip.radius || 50,
        0,
        Math.PI * 2,
        false
      );
      ctx.closePath();
    });
    
    // Guardar información del clipping como atributos para futura referencia
    group.setAttr('clipType', 'circle');
    group.setAttr('clipRadius', clip.radius);
    group.setAttr('clipX', clip.x || 0);
    group.setAttr('clipY', clip.y || 0);
    
  } else if (clip.type === 'rect') {
    group.clipFunc((ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.rect(
        clip.x || 0,
        clip.y || 0,
        clip.width || 100,
        clip.height || 100
      );
      ctx.closePath();
    });
    
    group.setAttr('clipType', 'rect');
    group.setAttr('clipWidth', clip.width);
    group.setAttr('clipHeight', clip.height);
    group.setAttr('clipX', clip.x || 0);
    group.setAttr('clipY', clip.y || 0);
  }
}

private crearNodoParaGrupo(elemento: any): Konva.Shape | Konva.Group | null {
  switch (elemento.tipo) {
    case 'Rect':
      return new Konva.Rect({
        x: elemento.x,
        y: elemento.y,
        width: elemento.width,
        height: elemento.height,
        fill: elemento.fill,
        stroke: elemento.stroke,
        strokeWidth: elemento.strokeWidth,
        cornerRadius: elemento.cornerRadius
      });

    case 'Circle':
      return new Konva.Circle({
        x: elemento.x,
        y: elemento.y,
        radius: elemento.radius,
        fill: elemento.fill,
        stroke: elemento.stroke,
        strokeWidth: elemento.strokeWidth
      });

    case 'Text':
      return new Konva.Text({
        x: elemento.x,
        y: elemento.y,
        text: elemento.text,
        fontSize: elemento.fontSize,
        fontFamily: elemento.fontFamily,
        fill: elemento.fill
      });

    case 'Image':
      // Para imágenes en grupos, necesitamos cargarlas de manera asíncrona
      this.cargarImagenParaGrupo(elemento);
      return null;

    case 'Line':
      return new Konva.Line({
        points: elemento.points,
        stroke: elemento.stroke,
        strokeWidth: elemento.strokeWidth,
        tension: elemento.tension
      });

    default:
      return null;
  }
}

private cargarImagenParaGrupo(elemento: any): void {
  const imageObj = new Image();
  imageObj.crossOrigin = 'Anonymous';
  imageObj.src = elemento.imageUrl;

  imageObj.onload = () => {
    const image = new Konva.Image({
      x: elemento.x,
      y: elemento.y,
      image: imageObj,
      width: elemento.width,
      height: elemento.height,
      cornerRadius: elemento.cornerRadius || 0
    });

    // Buscar el grupo padre con cast explícito
    const group = this.mainLayer.findOne((node: Konva.Node) => {
      return node.getClassName() === 'Group' && 
             Math.abs(node.x() - elemento.parentX) < 1 && 
             Math.abs(node.y() - elemento.parentY) < 1;
    }) as Konva.Group; // ← CAST EXPLÍCITO AQUÍ

    if (group) {
      group.add(image);
      this.mainLayer.draw();
    }
  };
}

private configurarInteracciones(node: Konva.Node): void {
  const tr = new Konva.Transformer({
    nodes: [node],
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    keepRatio: node.getClassName() === 'Circle' || node.getClassName() === 'Image',
    rotateEnabled: true,
    borderStroke: '#2d8cf0',
    anchorFill: '#2d8cf0',
    anchorStroke: '#fff',
    anchorSize: 8
  });

  this.mainLayer.add(tr);
  tr.visible(false);

  // Evento de clic para seleccionar
  node.on('click', (e) => {
    e.cancelBubble = true;
    
    // Ocultar todos los transformers primero con cast explícito
    this.mainLayer.find('Transformer').forEach((transformerNode: Konva.Node) => {
      const transformer = transformerNode as Konva.Transformer; // ← CAST EXPLÍCITO
      transformer.visible(false);
    });

    // Mostrar transformer del elemento seleccionado
    tr.visible(true);
    this.mainLayer.draw();
  });

  // Evento de doble clic para acciones específicas
  node.on('dblclick', (e) => {
    e.cancelBubble = true;
    
    if (node.getClassName() === 'Text') {
      this.editarTextoDirectamente(node as Konva.Text);
    } else if (node.getClassName() === 'Group') {
      this.manejarDobleClicGrupo(node as Konva.Group);
    }
  });

  node.setAttr('myTransformer', tr);
}

private editarTextoDirectamente(textNode: Konva.Text): void {
  // Crear un input temporal para edición directa
  const textPosition = textNode.absolutePosition();
  const stageBox = this.stage.container().getBoundingClientRect();
  
  const area = document.createElement('textarea');
  document.body.appendChild(area);
  
  area.value = textNode.text();
  area.style.position = 'absolute';
  area.style.top = (stageBox.top + textPosition.y) + 'px';
  area.style.left = (stageBox.left + textPosition.x) + 'px';
  area.style.width = (textNode.width() * textNode.scaleX()) + 'px';
  area.style.height = (textNode.height() * textNode.scaleY()) + 'px';
  area.style.fontSize = (textNode.fontSize() * textNode.scaleX()) + 'px';
  area.style.border = 'none';
  area.style.padding = '0px';
  area.style.margin = '0px';
  area.style.overflow = 'hidden';
  area.style.background = 'none';
  area.style.outline = 'none';
  area.style.resize = 'none';
  area.style.fontFamily = textNode.fontFamily();
  area.style.transformOrigin = 'left top';
  area.style.textAlign = textNode.align() as any;
  area.style.color = textNode.fill() as string;
  
  area.focus();
  
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      textNode.text(area.value);
      document.body.removeChild(area);
      this.mainLayer.draw();
    }
    
    if (e.key === 'Escape') {
      document.body.removeChild(area);
      this.mainLayer.draw();
    }
  });
}

private manejarDobleClicGrupo(group: Konva.Group): void {
  // Aquí puedes implementar acciones específicas para grupos
  //console.log('Doble clic en grupo:', group);
}









  // ========== MÉTODOS DE PLANTILLAS ==========
 





  // ========== MÉTODOS KONVA ==========
    initKonva(): void {
    const width = this.container.nativeElement.offsetWidth;
    const height = this.container.nativeElement.offsetHeight;

    this.stage = new Konva.Stage({
      container: 'konva-container',
      width: width,
      height: height
    });

    this.backgroundLayer = new Konva.Layer();
    this.stage.add(this.backgroundLayer);

    this.mainLayer = new Konva.Layer();
    this.stage.add(this.mainLayer);

    this.updateBackgroundColor(this.backgroundColor);
    this.renderTimelineBase();
  }

  updateBackgroundColor(color: string): void {
  this.backgroundColor = color;
  
  // Método seguro para limpiar el fondo
  this.limpiarFondoSeguro();
  
  const background = new Konva.Rect({
    id: 'background',
    x: 0,
    y: 0,
    width: this.stage.width(),
    height: this.stage.height(),
    fill: color,
    listening: false
  });

  this.backgroundLayer.add(background);
  this.backgroundLayer.moveToBottom();
  this.backgroundLayer.batchDraw();
}

private limpiarFondoSeguro(): void {
  // Encontrar el fondo actual y removerlo sin destruir
  const fondoActual = this.backgroundLayer.findOne('#background');
  if (fondoActual) {
    fondoActual.remove(); // ← USAR remove() EN LUGAR DE destroy()
  }
  
  // Alternativa: limpiar todo el layer de manera segura
  this.backgroundLayer.children?.forEach((child: Konva.Node) => {
    child.remove(); // Remover sin destruir
  });
  this.backgroundLayer.clear(); // Limpiar el buffer de dibujo
}

//LINEA RECTA BASE DEL LA LINEA DE TIEMPO

//################################################

  drawTimelineBase(): void {
    /*const timeline = new Konva.Line({
      points: [50, this.stage.height() / 2, this.stage.width() - 50, this.stage.height() / 2],
      stroke: '#070707ff',
      strokeWidth: 5,
      lineCap: 'round'
    });
    this.mainLayer.add(timeline);*/

    this.renderTimelineBase();
  }
//################################################

 renderTimelineEvents(): void {
  // Eliminar SOLO los grupos de eventos de línea de tiempo, nada más
  this.limpiarSoloGruposEventos();
  
  
  // Dibujar línea base si es necesario
  if (!this.existeLineaTiempo()) {
    this.renderTimelineBase();
  }
  
  // Recrear eventos con nuevas posiciones según el layout actual
  this.timelineEvents.forEach(event => {
    this.createTimelineEvent(event);
  });
  
  this.mainLayer.batchDraw();
}




/**
 * ✅ NUEVO MÉTODO: Limpiar completamente todos los elementos de la línea de tiempo
 */
private limpiarCompletamenteLineaTiempo(): void {
  // 1. Eliminar línea base
  const oldLine = this.mainLayer.findOne('#timeline-base');
  if (oldLine) {
    oldLine.destroy();
  }

  // 2. Eliminar TODOS los marcadores de timeline
  const markers = this.mainLayer.find('.timeline-marker');
  markers.forEach(marker => {
    marker.destroy();
  });

  // 3. Eliminar fondo de timeline si existe
  const background = this.mainLayer.findOne('.timeline-background');
  if (background) {
    background.destroy();
  }

  // 4. Limpiar cualquier elemento residual relacionado con timeline
  this.mainLayer.children?.forEach((child: Konva.Node) => {
    const className = child.getClassName();
    // Eliminar líneas que podrían ser de timeline (verificación más amplia)
    if (className === 'Line' && child !== oldLine) {
      const points = (child as Konva.Line).points();
      // Si es una línea horizontal/vertical que podría ser timeline
      if (points.length === 4) {
        const [x1, y1, x2, y2] = points;
        // Detectar líneas que podrían ser de timeline por su posición
        if ((y1 === y2 && Math.abs(y1 - this.stage.height() / 2) < 10) || 
            (x1 === x2 && Math.abs(x1 - this.stage.width() / 2) < 10)) {
          child.destroy();
        }
      }
    }
  });
}


private limpiarSoloGruposEventos(): void {
  const elementosAEliminar: Konva.Node[] = [];
  
  this.mainLayer.children?.forEach((child: Konva.Node) => {
    // Solo eliminar grupos que sean eventos (no título, no descripción, no transformers)
    if (child instanceof Konva.Group) {
      // Verificar si es un evento por su contenido o atributo
      const tieneConnector = child.children?.some(c => c instanceof Konva.Line);
      const tieneYear = child.children?.some(c => 
        c instanceof Konva.Text && c.text().match(/^\d{4}$/)
      );
      const esEventoTimeline = child.getAttr('timelineEvent');
      
      if ((tieneConnector && tieneYear) || esEventoTimeline) {
        elementosAEliminar.push(child);
      }
    }
  });
  
  elementosAEliminar.forEach(elemento => {
    const transformer = elemento.getAttr('myTransformer');
    if (transformer) {
      transformer.remove();
    }
    elemento.remove();
  });
}
private existeLineaTiempo(): boolean {
  return this.mainLayer.children?.some(child => 
    child instanceof Konva.Line && 
    child.points().length === 4
  ) || false;
}

// Método para identificar elementos que deben preservarse
private esElementoPreservar(node: Konva.Node): boolean {
  // Preservar título y descripción del proyecto
  if (node === this.proyectoTitleElement || node === this.proyectoDescriptionElement) {
    return true;
  }
  
  // Preservar transformers
  if (node.getClassName() === 'Transformer') {
    return true;
  }
  
  // Preservar elementos decorativos (rectángulos, círculos, texto adicional, etc.)
  const className = node.getClassName();
  const esElementoDecorativo = [
    'Rect', 'Circle', 'Text', 'Image', 'Star', 'Group'
  ].includes(className);
  
  // Pero NO preservar eventos de línea de tiempo (estos se recrean)
  const esEventoLineaTiempo = node.getAttr('esEvento') === true;
  
  return esElementoDecorativo && !esEventoLineaTiempo;
}

  

createTimelineEvent(event: TimelineEvent): void {
  // ✅ ORDEN DE PRIORIDAD CORREGIDO PARA POSICIÓN:
  // 1. posicionLibre del evento guardado (MAYOR PRIORIDAD)
  // 2. Posición del grupo serializado en elementosKonva
  // 3. zonaDesign.posicion (solo como referencia de diseño, no posición)
  // 4. Calcular según año (fallback)
  
  const posicionLibreGuardada = (event as any)['posicionLibre'];
  const zonaDesign = (event as any).zonaDesign;
  
  let position;
  
  // ✅ PRIORIDAD 1: posicionLibre guardada explícitamente
  if (posicionLibreGuardada && posicionLibreGuardada.x !== undefined && posicionLibreGuardada.y !== undefined) {
    position = { 
      x: posicionLibreGuardada.x, 
      y: posicionLibreGuardada.y 
    };
    console.log(`📍 Evento "${event.title}" - Usando posicionLibre guardada (${position.x}, ${position.y})`);
  }
  // ✅ PRIORIDAD 2: Buscar en elementosKonva serializados
  else {
    const posicionDeElementosKonva = this.buscarPosicionEnElementosKonva(event);
    if (posicionDeElementosKonva) {
      position = posicionDeElementosKonva;
      console.log(`📍 Evento "${event.title}" - Usando posición de elementosKonva (${position.x}, ${position.y})`);
    }
    // ✅ PRIORIDAD 3: zonaDesign.posicion (solo si no hay nada más)
    else if (zonaDesign && zonaDesign.posicion) {
      position = { 
        x: zonaDesign.posicion.x, 
        y: zonaDesign.posicion.y 
      };
      console.log(`📍 Evento "${event.title}" - Usando posición de zonaDesign (fallback)`);
    }
    // ✅ PRIORIDAD 4: Calcular según año (último recurso)
    else {
      position = this.calculateEventPosition(event.year);
      console.log(`📍 Evento "${event.title}" - Calculando por año ${event.year}`);
    }
  }
  
  if (!position) return;

  const group = new Konva.Group({
    x: position.x,
    y: position.y,
    draggable: true,
    dragBoundFunc: (pos) => this.getDragBoundPosition(pos, position.y, position.x)
  });

  // ✅ Aplicar SOLO diseño visual (textos, imágenes, contenedores)
  if (zonaDesign && zonaDesign.elementos) {
    this.aplicarDiseñoPlantilla(group, event, zonaDesign);
  }

  // ✅ Marcar como evento de timeline
  group.setAttr('timelineEvent', event);
  group.setAttr('esEvento', true);

  this.configurarInteracciones(group);
  this.configurarEventosTimeline(group, event, position);
  this.mainLayer.add(group);
}


private buscarPosicionEnElementosKonva(event: TimelineEvent): { x: number; y: number } | null {
  try {
    // Buscar en los grupos serializados que tengan el título del evento
    const grupos = this.mainLayer.find('Group');
    
    for (let i = 0; i < grupos.length; i++) {
      const grupo = grupos[i] as Konva.Group;
      const eventoAsociado = grupo.getAttr('timelineEvent');
      
      // Verificar si es el evento que buscamos
      if (eventoAsociado && 
          eventoAsociado.year === event.year && 
          eventoAsociado.title === event.title) {
        return {
          x: grupo.x(),
          y: grupo.y()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Error buscando posición en elementosKonva:', error);
    return null;
  }
}


private configurarEventosTimeline(group: Konva.Group, event: TimelineEvent,position:any): void {
  group.on('dblclick', (e) => {
    e.cancelBubble = true;
    this.editEvent(event);
  });

  group.on('dragend', () => {
    this.updateEventPosition(event, group.x(), group.y());
  });

  group.setAttr('timelineEvent', event);
  group.setAttr('originalPosition', position);
}



private aplicarDiseñoPlantilla(group: Konva.Group, event: TimelineEvent, zonaDesign: any): void {
  
  // ✅ ESTABLECER POSICIÓN DEL GRUPO PRIMERO
  /*const posicionZona = zonaDesign.posicion;
  group.position({ 
    x: posicionZona.x, 
    y: posicionZona.y 
  });*/

  // ✅ LUEGO crear elementos con coordenadas RELATIVAS al grupo
  if (zonaDesign.elementos && Array.isArray(zonaDesign.elementos)) {
    zonaDesign.elementos.forEach((elemento: any) => {
      this.crearElementoDesdePlantilla(group, elemento, event);
    });
  }

}





private extraerTextoDeElementos(zona: any): { titulo: string, fecha: string, descripcion: string } {
  const elementos = zona.elementos || [];
  let titulo = `Evento ${zona.orden || 1}`;
  let fecha = '';
  let descripcion = '';

  elementos.forEach((elemento: any) => {
    if (elemento.configuracion && elemento.configuracion.texto) {
      switch (elemento.tipo) {
        case 'titulo':
          titulo = elemento.configuracion.texto;
          break;
        case 'fecha':
          fecha = elemento.configuracion.texto;
          break;
        case 'descripcion':
          descripcion = elemento.configuracion.texto;
          break;
      }
    }
  });

  return { titulo, fecha, descripcion };
}


private crearElementoDesdePlantilla(group: Konva.Group, elemento: any, event: TimelineEvent): void {
  let konvaElement: Konva.Shape | Konva.Group | null = null;

  switch (elemento.tipo) {
    case 'contenedor':
      /*konvaElement = new Konva.Rect({
        x: elemento.x,
        y: elemento.y,
        width: elemento.width,
        height: elemento.height,
        fill: elemento.configuracion.fill,
        stroke: elemento.configuracion.stroke,
        strokeWidth: elemento.configuracion.strokeWidth,
        cornerRadius: elemento.configuracion.cornerRadius,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });*/

       konvaElement = this.crearContenedorSegunForma(elemento);
      break;
     
      
    case 'titulo':
      const tituloTexto = event.title || 'Nuevo Evento';
      konvaElement = new Konva.Text({
        x: elemento.x,
        y: elemento.y,
        text: tituloTexto,
        fontSize: elemento.configuracion.fontSize,
        fontFamily: elemento.configuracion.fontFamily,
        fill: elemento.configuracion.color,
        fontStyle: elemento.configuracion.fontWeight,
        align: elemento.configuracion.textAlign as any,
        width: elemento.width,
        height: elemento.height,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      break;
      
    case 'fecha':
      const fechaTexto = event.year.toString();
      konvaElement = new Konva.Text({
        x: elemento.x,
        y: elemento.y,
        text: fechaTexto,
        fontSize: elemento.configuracion.fontSize,
        fontFamily: elemento.configuracion.fontFamily,
        fill: elemento.configuracion.color,
        fontStyle: elemento.configuracion.fontWeight,
        align: elemento.configuracion.textAlign as any,
        width: elemento.width,
        height: elemento.height,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      break;
       case 'personaje':
      // ✅ NUEVO: Crear elemento de personaje
      const personajeTexto = event.person || 'Agregar personaje...';
      konvaElement = new Konva.Text({
        x: elemento.x,
        y: elemento.y,
        text: personajeTexto,
        fontSize: elemento.configuracion.fontSize,
        fontFamily: elemento.configuracion.fontFamily,
        fill: elemento.configuracion.color,
        fontStyle: elemento.configuracion.fontWeight,
        align: elemento.configuracion.textAlign as any,
        width: elemento.width,
        height: elemento.height,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      break;

    case 'descripcion':
      // ✅ NUEVO: Crear elemento de descripción
      const descripcionTexto = event.description || 'Agregar descripción...';
      konvaElement = new Konva.Text({
        x: elemento.x,
        y: elemento.y,
        text: descripcionTexto,
        fontSize: elemento.configuracion.fontSize,
        fontFamily: elemento.configuracion.fontFamily,
        fill: elemento.configuracion.color,
        fontStyle: elemento.configuracion.fontWeight,
        align: elemento.configuracion.textAlign as any,
        width: elemento.width,
        height: elemento.height,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      break;

    case 'link':
      // ✅ NUEVO: Crear elemento de link
      konvaElement = this.crearElementoLink(elemento, event);
      break;
      
    case 'imagen':
      // ✅ CREAR DIRECTAMENTE LA FORMA SIN GRUPO ADICIONAL
      if (event.image) {
        konvaElement = this.crearImagenDirecta(elemento, event.image);
      } else {
        konvaElement = this.crearPlaceholderImagenDirecto(elemento);
      }
      break;
  }

  if (konvaElement) {
    konvaElement.setAttr('elementoTipo', elemento.tipo);
    konvaElement.setAttr('elementoId', elemento.id);
    group.add(konvaElement);
  }
}


private crearContenedorSegunForma(elemento: any): Konva.Shape {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const x = elemento.x;
  const y = elemento.y;
  const width = elemento.width;
  const height = elemento.height;
  const fill = elemento.configuracion.fill;
  const stroke = elemento.configuracion.stroke;
  const strokeWidth = elemento.configuracion.strokeWidth;
  const rotation = elemento.configuracion.rotation || 0;
  const visible = elemento.visible !== false;

  switch (forma) {
    case 'circulo':
      // ✅ Contenedor circular
      return new Konva.Circle({
        x: x + width / 2,  // Centro del área
        y: y + height / 2,
        radius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        rotation: rotation,
        visible: visible
      });

    case 'estrella':
      // ✅ Contenedor en forma de estrella
      return new Konva.Star({
        x: x + width / 2,
        y: y + height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        rotation: rotation,
        visible: visible
      });

    case 'rombo':
      // ✅ Contenedor en forma de rombo
      return new Konva.Line({
        points: [
          x + width / 2, y,           // top
          x + width, y + height / 2,  // right
          x + width / 2, y + height,  // bottom
          x, y + height / 2           // left
        ],
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true,
        rotation: rotation,
        visible: visible
      });

    case 'linea':
      // ✅ CORREGIDO: Manejar rotación correctamente
      const lineaSimple = new Konva.Line({
        points: this.calcularPuntosLineaSinRotacion(elemento),
        stroke: stroke,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        visible: visible
      });
      
      // Aplicar offset y rotación
      this.aplicarRotacionLinea(lineaSimple, elemento);
      return lineaSimple;

    case 'linea-punteada':
      // ✅ CORREGIDO: Manejar rotación correctamente
      const lineaPunteada = new Konva.Line({
        points: this.calcularPuntosLineaSinRotacion(elemento),
        stroke: stroke,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        dash: elemento.configuracion.dashPattern || [10, 5],
        visible: visible
      });
      
      // Aplicar offset y rotación
      this.aplicarRotacionLinea(lineaPunteada, elemento);
      return lineaPunteada;

    case 'flecha':
      // ✅ CORREGIDO: Manejar rotación correctamente
      const flecha = new Konva.Arrow({
        points: this.calcularPuntosLineaSinRotacion(elemento),
        stroke: stroke,
        strokeWidth: strokeWidth,
        fill: stroke,
        pointerLength: elemento.configuracion.pointerLength || Math.min(20, Math.max(width, height) * 0.2),
        pointerWidth: elemento.configuracion.pointerWidth || Math.min(15, Math.max(width, height) * 0.15),
        lineCap: 'round',
        lineJoin: 'round',
        visible: visible
      });
      
      // Aplicar offset y rotación
      this.aplicarRotacionLinea(flecha, elemento);
      return flecha;


    case 'triangulo':
      // ✅ Contenedor triangular
      return new Konva.Line({
        points: [
          x + width / 2, y,           // top
          x + width, y + height,      // bottom right
          x, y + height               // bottom left
        ],
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true,
        rotation: rotation,
        visible: visible
      });

    

    case 'rectangulo':
    default:
      // ✅ Contenedor rectangular (default)
      return new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: height,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion.cornerRadius || 0,
        rotation: rotation,
        visible: visible
      });
  }
}



private calcularPuntosLineaSinRotacion(elemento: any): number[] {
  const config = elemento.configuracion;
  
  // Si hay puntos personalizados
  if (config.puntos && Array.isArray(config.puntos) && config.puntos.length >= 4) {
    return config.puntos;
  }
  
  const width = Math.abs(elemento.width || 0);
  const height = Math.abs(elemento.height || 0);
  const rotation = config.rotation || 0;
  
  // ✅ LÓGICA SIMPLE:
  // - Para rotación 90°/270°: la línea HORIZONTAL (width) se rota a VERTICAL
  // - Para rotación 0°/180°: la línea usa width normalmente
  // - Para otras: usar la dimensión más pequeña (es el grosor, no la longitud)
  
  let longitud: number;
  
  if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
    // Vertical: usar WIDTH (porque se rotará)
    longitud = width;
  } else if (rotation === 0 || rotation === 180 || rotation === -180 || !rotation) {
    // Horizontal: usar WIDTH
    longitud = width;
  } else {
    // Diagonal: usar menor dimensión (la mayor es el "área")
    longitud = Math.min(width, height);
  }
  
  const puntos = [0, 0, longitud, 0];
  
  console.log(`📐 Línea: ${longitud}px (w=${width}, h=${height}, rot=${rotation}°)`);
  return puntos;
}

// ==================== MÉTODO: aplicarRotacionLinea (SIN CAMBIOS) ====================
private aplicarRotacionLinea(linea: Konva.Line | Konva.Arrow, elemento: any): void {
  const x = elemento.x;
  const y = elemento.y;
  const rotation = elemento.configuracion.rotation || 0;
  
  if (rotation !== 0) {
    linea.position({ x: x, y: y });
    linea.offsetX(0);
    linea.offsetY(0);
    linea.rotation(rotation);
    
    console.log(`🔄 Línea rotada ${rotation}° en (${x}, ${y})`);
  } else {
    linea.position({ x: x, y: y });
    console.log(`📍 Línea sin rotación en (${x}, ${y})`);
  }
}


private crearFlechaShape(x: number, y: number, width: number, height: number,elemento: any, stroke: string, strokeWidth: number, rotation: number, visible: boolean): Konva.Arrow {
  return new Konva.Arrow({
    points: this.calcularPuntosLinea(elemento),
    stroke: stroke,
    strokeWidth: strokeWidth,
    fill: stroke,
    pointerLength: Math.min(20, width * 0.2),
    pointerWidth: Math.min(15, width * 0.15),
    lineCap: 'round',
    lineJoin: 'round',
    rotation: rotation,
    visible: visible
  });
}

private calcularPuntosLinea(elemento: any): number[] {
  const config = elemento.configuracion;
  
  // ✅ PRIORIDAD 1: Si hay puntos personalizados en la configuración, usarlos
  if (config.puntos && Array.isArray(config.puntos) && config.puntos.length >= 4) {
    console.log('📍 Usando puntos personalizados:', config.puntos);
    return config.puntos;
  }
  
  // ✅ PRIORIDAD 2: Calcular desde las propiedades del elemento
  const x = elemento.x;
  const y = elemento.y;
  const width = elemento.width || 100;
  const height = elemento.height || 0;
  
  // Determinar orientación según width y height
  if (Math.abs(height) > Math.abs(width)) {
    // Línea más vertical que horizontal
    const puntos = [x, y, x + width, y + height];
    console.log('📐 Calculando línea vertical:', puntos);
    return puntos;
  } else {
    // Línea más horizontal que vertical
    const puntos = [x, y, x + width, y + height];
    console.log('📐 Calculando línea horizontal:', puntos);
    return puntos;
  }
}

private crearImagenDirecta(elemento: any, imageUrl: string): Konva.Shape {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const stroke = elemento.configuracion?.stroke || '#000000';
  const strokeWidth = elemento.configuracion?.strokeWidth || 2;

  let placeholder: Konva.Shape;

  switch (forma) {
    case 'circulo':
      // ✅ USAR coordenadas EXACTAS del JSON sin modificar
      placeholder = new Konva.Circle({
         x: elemento.x + width / 2,  // Posición X relativa + centro
        y: elemento.y + height / 2, // Posición Y relativa + centro
        radius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });
      break;

    case 'estrella':
      placeholder = new Konva.Star({
        x: elemento.x + width / 2,
        y: elemento.y + height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });
      break;

    case 'rombo':
      // ✅ Puntos relativos exactamente como en la plantilla
       const points = [
        elemento.x + width / 2, elemento.y,           // top
        elemento.x + width, elemento.y + height / 2,  // right
        elemento.x + width / 2, elemento.y + height,  // bottom
        elemento.x, elemento.y + height / 2          // left
      ];
      placeholder = new Konva.Line({
        points: points,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });
      break;

    case 'rectangulo':
    default:
      placeholder = new Konva.Rect({
        x: elemento.x,  // Posición X exacta del JSON
        y: elemento.y,  // Posición Y exacta del JSON
        width: width,
        height: height,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion?.borderRadius || 0
      });
      break;
  }

  // Cargar imagen en segundo plano y reemplazar placeholder
  this.cargarYReemplazarImagenDirecta(elemento, imageUrl, placeholder);

  return placeholder;
}


private cargarYReemplazarImagenDirecta(elemento: any, imageUrl: string, placeholder: Konva.Shape): void {
  const imageObj = new Image();
  
  imageObj.onload = () => {
    try {
      const forma = elemento.configuracion?.forma || 'rectangulo';
      const width = elemento.width;
      const height = elemento.height;
      const stroke = elemento.configuracion?.stroke || '#000000';
      const strokeWidth = elemento.configuracion?.strokeWidth || 2;

      let imagenFinal: Konva.Shape;

      switch (forma) {
        case 'circulo':
          imagenFinal = new Konva.Circle({
           x: elemento.x + width / 2,  // ✅ Misma posición que el placeholder
            y: elemento.y + height / 2,
            radius: Math.min(width, height) / 2,
            fillPatternImage: imageObj,
            fillPatternOffset: { x: imageObj.width / 2, y: imageObj.height / 2 },
            fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
            stroke: stroke,
            strokeWidth: strokeWidth
          });
          break;

        case 'estrella':
          imagenFinal = new Konva.Star({
              x: elemento.x + width / 2,
            y: elemento.y + height / 2,
            numPoints: 5,
            innerRadius: Math.min(width, height) * 0.4,
            outerRadius: Math.min(width, height) / 2,
            fillPatternImage: imageObj,
            fillPatternOffset: { x: imageObj.width / 2, y: imageObj.height / 2 },
            fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
            stroke: stroke,
            strokeWidth: strokeWidth
          });
          break;

        case 'rombo':
          const points = [
            elemento.x + width / 2, elemento.y,
            elemento.x + width, elemento.y + height / 2,
            elemento.x + width / 2, elemento.y + height,
            elemento.x, elemento.y + height / 2
          ];
          imagenFinal = new Konva.Line({
            points: points,
            closed: true,
            fillPatternImage: imageObj,
            fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
            stroke: stroke,
            strokeWidth: strokeWidth
          });
          break;

        case 'rectangulo':
        default:
          imagenFinal = new Konva.Image({
             x: elemento.x,  // ✅ Posición exacta del JSON
            y: elemento.y,
            width: width,
            height: height,
            image: imageObj,
            cornerRadius: elemento.configuracion?.borderRadius || 0
          });
          break;
      }

      // Reemplazar placeholder
      const layer = placeholder.getLayer();
      const parent = placeholder.getParent();
      
      if (parent) {
        const index = parent.children?.indexOf(placeholder) || 0;
        placeholder.destroy();
        parent.add(imagenFinal);
        
        if (index > 0) {
          imagenFinal.setZIndex(index);
        }
      }
      
      layer?.batchDraw();

    } catch (error) {
      console.error('Error creando imagen:', error);
    }
  };

  imageObj.onerror = () => {
    console.error('Error cargando imagen:', imageUrl);
  };

  imageObj.crossOrigin = 'Anonymous';
  imageObj.src = imageUrl;
}

private crearPlaceholderImagenDirecto(elemento: any): Konva.Shape {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const stroke = elemento.configuracion?.stroke || '#dee2e6';
  const strokeWidth = elemento.configuracion?.strokeWidth || 1;

  switch (forma) {
    case 'circulo':
      return new Konva.Circle({
        x: elemento.x + width / 2,
        y: elemento.y + height / 2,
        radius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'estrella':
      return new Konva.Star({
        x: elemento.x + width / 2,
        y: elemento.y + height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'rombo':
      const points = [
        elemento.x + width / 2, elemento.y,
        elemento.x + width, elemento.y + height / 2,
        elemento.x + width / 2, elemento.y + height,
        elemento.x, elemento.y + height / 2
      ];
      return new Konva.Line({
        points: points,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });

    case 'rectangulo':
    default:
      return new Konva.Rect({
        x: elemento.x,
        y: elemento.y,
        width: width,
        height: height,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion?.borderRadius || 0
      });
  }
}




private crearImagenDesdePlantilla(elemento: any, imageUrl: string): Konva.Group {
  // ✅ CORRECCIÓN CRÍTICA: Ajustar posición según la forma
  const posicion = this.normalizarPosicionSegunForma(elemento);
  
  const group = new Konva.Group({
    x: posicion.x,  // ← Posición normalizada (siempre esquina superior izquierda)
    y: posicion.y   // ← Posición normalizada
  });

  // Crear placeholder según la forma
  const placeholder = this.crearPlaceholderSegunForma(elemento);
  group.add(placeholder);

  // Cargar imagen en segundo plano
  this.cargarImagenBackground(elemento, imageUrl, group, placeholder);

  return group;
}

private normalizarPosicionSegunForma(elemento: any): { x: number; y: number } {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const x = elemento.x;
  const y = elemento.y;
  const width = elemento.width;
  const height = elemento.height;

  console.log(`📐 Normalizando posición para ${forma}:`, { x, y, width, height });

  switch (forma) {
    case 'circulo':
    case 'estrella':
    case 'rombo':
      // ✅ Para formas centradas: restar la mitad del tamaño para obtener esquina superior izquierda
      const xNormalizado = x - width / 2;
      const yNormalizado = y - height / 2;
      console.log(`  → Convertido de centro a esquina: (${xNormalizado}, ${yNormalizado})`);
      return {
        x: xNormalizado,
        y: yNormalizado
      };

    case 'rectangulo':
    default:
      // ✅ Para rectángulos: las coordenadas ya son esquina superior izquierda
      console.log(`  → Manteniendo coordenadas (ya es esquina): (${x}, ${y})`);
      return { x, y };
  }
}

private calcularPosicionNormalizada(elemento: any): { x: number; y: number } {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const x = elemento.x;
  const y = elemento.y;
  const width = elemento.width;
  const height = elemento.height;

  switch (forma) {
    case 'circulo':
      // Para círculos, el JSON guarda el centro, pero el grupo necesita esquina superior izquierda
      return {
        x: x - width / 2,
        y: y - height / 2
      };

    case 'estrella':
      // Similar al círculo
      return {
        x: x - width / 2,
        y: y - height / 2
      };

    case 'rombo':
      // Similar al círculo
      return {
        x: x - width / 2,
        y: y - height / 2
      };

    case 'rectangulo':
    default:
      // Para rectángulos, el JSON ya guarda la esquina superior izquierda
      return { x, y };
  }
}

private crearPlaceholderSegunForma(elemento: any): Konva.Shape {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const stroke = elemento.configuracion?.stroke || '#000000';
  const strokeWidth = elemento.configuracion?.strokeWidth || 2;

  switch (forma) {
    case 'circulo':
      // ✅ Dibujar desde el centro del área del grupo
      return new Konva.Circle({
        x: width / 2,      // Centro horizontal del área
        y: height / 2,     // Centro vertical del área
        radius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'estrella':
      return new Konva.Star({
        x: width / 2,      // Centro del área
        y: height / 2,     // Centro del área
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'rombo':
      // ✅ Puntos del rombo relativos al área del grupo (0,0 a width,height)
      return new Konva.Line({
        points: [
          width / 2, 0,           // top (centro superior)
          width, height / 2,      // right (centro derecho)
          width / 2, height,      // bottom (centro inferior)
          0, height / 2          // left (centro izquierdo)
        ],
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });

    case 'rectangulo':
    default:
      // ✅ Rectángulo desde la esquina (0,0) del grupo
      return new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion?.borderRadius || 0
      });
  }
}
private cargarYReemplazarImagen(elemento: any, imageUrl: string, imageGroup: Konva.Group, placeholder: Konva.Rect): void {
  const imageObj = new Image();
  
  imageObj.onload = () => {
    try {
      // Crear la imagen Konva
      const konvaImage = new Konva.Image({
        width: elemento.width,
        height: elemento.height,
        image: imageObj,
        cornerRadius: elemento.configuracion?.borderRadius || 0,
        perfectDrawEnabled: false,
        listening: false
      });

      // Aplicar objectFit si es necesario
      this.aplicarObjectFit(konvaImage, imageObj, elemento.configuracion?.objectFit);

      // Reemplazar placeholder con la imagen real
      placeholder.destroy();
      imageGroup.children?.forEach(child => {
        if (child instanceof Konva.Text) child.destroy();
      });
      
      imageGroup.add(konvaImage);
      imageGroup.getLayer()?.batchDraw();

    } catch (error) {
      console.error('Error creando imagen Konva:', error);
      this.mostrarErrorImagen(imageGroup, elemento, 'Error al crear imagen');
    }
  };

  imageObj.onerror = () => {
    console.error('Error cargando imagen:', imageUrl);
    this.mostrarErrorImagen(imageGroup, elemento, 'Error al cargar');
  };

  imageObj.crossOrigin = 'Anonymous';
  imageObj.src = imageUrl;
}
private mostrarErrorImagen(imageGroup: Konva.Group, elemento: any, mensaje: string): void {
  // Limpiar grupo
  imageGroup.children?.forEach(child => child.destroy());

  // Crear fondo de error
  const errorBg = new Konva.Rect({
    width: elemento.width,
    height: elemento.height,
    fill: '#ffebee',
    stroke: '#f44336',
    strokeWidth: 1,
    cornerRadius: elemento.configuracion?.borderRadius || 0,
    listening: false
  });

  const errorIcon = new Konva.Text({
    x: elemento.width / 2,
    y: elemento.height / 2 - 10,
    text: '❌',
    fontSize: 16,
    fontFamily: 'Arial',
    fill: '#d32f2f',
    align: 'center',
    offsetX: 8,
    offsetY: 8,
    listening: false
  });

  const errorText = new Konva.Text({
    x: elemento.width / 2,
    y: elemento.height / 2 + 10,
    text: mensaje,
    fontSize: 9,
    fontFamily: 'Arial',
    fill: '#d32f2f',
    align: 'center',
    offsetX: 25,
    listening: false
  });

  imageGroup.add(errorBg);
  imageGroup.add(errorIcon);
  imageGroup.add(errorText);
  imageGroup.getLayer()?.batchDraw();
}


private crearPlaceholderRect(elemento: any): Konva.Rect {
  return new Konva.Rect({
    width: elemento.width,
    height: elemento.height,
    fill: '#f8f9fa',
    stroke: elemento.configuracion?.stroke || '#3498db',
    strokeWidth: elemento.configuracion?.strokeWidth || 2,
    cornerRadius: elemento.configuracion?.borderRadius || 0
  });
}

private cargarImagenBackground(elemento: any, imageUrl: string, group: Konva.Group, placeholder: Konva.Shape): void {
  const imageObj = new Image();
  
  imageObj.onload = () => {
    try {
      // Crear la imagen Konva según la forma
      const konvaImage = this.crearImagenKonvaSegunForma(elemento, imageObj);
      
      // Aplicar objectFit si está configurado
      this.aplicarObjectFit(konvaImage, imageObj, elemento.configuracion?.objectFit);

      // Reemplazar placeholder con imagen
      placeholder.destroy();
      group.add(konvaImage);
      
      // Forzar redibujado
      group.getLayer()?.batchDraw();

    } catch (error) {
      console.error('Error creando imagen Konva:', error);
      this.mostrarEstadoImagen(group, elemento, '❌ Error', '#ffebee');
    }
  };

  imageObj.onerror = () => {
    console.error('Error cargando imagen:', imageUrl);
    this.mostrarEstadoImagen(group, elemento, '❌ Error carga', '#ffebee');
  };

  imageObj.crossOrigin = 'Anonymous';
  imageObj.src = imageUrl;
}

private crearImagenKonvaSegunForma(elemento: any, imageObj: HTMLImageElement): Konva.Shape {
  const forma = elemento.configuracion?.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const stroke = elemento.configuracion?.stroke || '#000000';
  const strokeWidth = elemento.configuracion?.strokeWidth || 6;

  switch (forma) {
    case 'circulo':
      return new Konva.Circle({
        x: width / 2,      // ✅ Centro dentro del grupo
        y: height / 2,
        radius: Math.min(width, height) / 2,
        fillPatternImage: imageObj,
        fillPatternOffset: { x: width / 2, y: height / 2 },
        fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'estrella':
      return new Konva.Star({
        x: width / 2,
        y: height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fillPatternImage: imageObj,
        fillPatternOffset: { x: width / 2, y: height / 2 },
        fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'rombo':
      return new Konva.Line({
        points: [width/2, 0, width, height/2, width/2, height, 0, height/2],
        closed: true,
        fillPatternImage: imageObj,
        fillPatternOffset: { x: 0, y: 0 },
        fillPatternScale: this.calcularEscalaImagenCover(imageObj, width, height),
        stroke: stroke,
        strokeWidth: strokeWidth
      });

    case 'rectangulo':
    default:
      return new Konva.Image({
        x: 0,
        y: 0,
        width: width,
        height: height,
        image: imageObj,
        cornerRadius: elemento.configuracion?.borderRadius || 0
      });
  }
}

private calcularEscalaImagenCover(image: HTMLImageElement, targetWidth: number, targetHeight: number): { x: number; y: number } {
  const scaleX = targetWidth / image.width;
  const scaleY = targetHeight / image.height;
  const scale = Math.max(scaleX, scaleY);
  
  return { x: scale, y: scale };
}

private calcularEscalaImagen(image: HTMLImageElement, targetWidth: number, targetHeight: number): { x: number; y: number } {
  const scaleX = targetWidth / image.naturalWidth;
  const scaleY = targetHeight / image.naturalHeight;
  const scale = Math.max(scaleX, scaleY); // Cover mode
  
  return { x: scale, y: scale };
}

private mostrarEstadoImagen(group: Konva.Group, elemento: any, texto: string, colorFondo: string): void {
  // Limpiar grupo excepto el background
  const children = group.children?.slice() || [];
  children.forEach(child => {
    // Mantener solo el shape de fondo (no texto ni iconos)
    if (!(child instanceof Konva.Circle) && 
        !(child instanceof Konva.Rect) && 
        !(child instanceof Konva.Star) && 
        !(child instanceof Konva.Line)) {
      child.destroy();
    }
  });

  // Encontrar y actualizar el fondo
  const background = group.children?.find(child => 
    child instanceof Konva.Circle || 
    child instanceof Konva.Rect || 
    child instanceof Konva.Star || 
    child instanceof Konva.Line
  ) as Konva.Shape | undefined;

  if (background && 'fill' in background) {
    background.fill(colorFondo);
  }

  // Agregar texto de estado
  const estadoText = new Konva.Text({
    x: elemento.width / 2,
    y: elemento.height / 2,
    text: texto,
    fontSize: 10,
    fontFamily: 'Arial',
    fill: '#d32f2f',
    align: 'center',
    offsetX: texto.length * 3,
    offsetY: 5
  });

  group.add(estadoText);
  group.getLayer()?.batchDraw();
}



private crearPlaceholderImagen(elemento: any): Konva.Group {
  const group = new Konva.Group({
    x: elemento.x,  // ← POSICIÓN RELATIVA A LA ZONA (del JSON)
    y: elemento.y   // ← POSICIÓN RELATIVA A LA ZONA (del JSON)
  });

  const forma = elemento.configuracion?.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const stroke = elemento.configuracion?.stroke || '#dee2e6';
  const strokeWidth = elemento.configuracion?.strokeWidth || 1;

  let background: Konva.Shape;

  switch (forma) {
    case 'circulo':
      background = new Konva.Circle({
        x: width / 2,      // Centro dentro del área del grupo
        y: height / 2,
        radius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });
      break;

    case 'estrella':
      background = new Konva.Star({
        x: width / 2,
        y: height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth
      });
      break;

    case 'rombo':
      background = new Konva.Line({
        points: [width/2, 0, width, height/2, width/2, height, 0, height/2],
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });
      break;

    case 'rectangulo':
    default:
      background = new Konva.Rect({
        x: 0,              // Esquina superior izquierda del área
        y: 0,
        width: width,
        height: height,
        fill: '#f8f9fa',
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion?.borderRadius || 0
      });
      break;
  }

  // ✅ CORRECCIÓN: Icono centrado SIN offsetX/offsetY incorrectos
  const icon = new Konva.Text({
    x: width / 2,
    y: height / 2 - 8,
    text: '🖼️',
    fontSize: 16,
    fontFamily: 'Arial',
    fill: '#6c757d',
    align: 'center',
    offsetX: 8,    // ✅ Solo para centrar el emoji (mitad del ancho aprox)
    offsetY: 0     // ✅ Sin offset Y extra
  });

  const text = new Konva.Text({
    x: width / 2,
    y: height / 2 + 8,
    text: 'Sin imagen',
    fontSize: 9,
    fontFamily: 'Arial',
    fill: '#6c757d',
    align: 'center',
    width: width,         // ✅ IMPORTANTE: dar ancho para que center funcione
    offsetX: width / 2,   // ✅ Centrar correctamente con el ancho
    offsetY: 0
  });

  group.add(background);
  group.add(icon);
  group.add(text);

  return group;
}
private aplicarObjectFit(konvaImage: Konva.Shape |Konva.Group, htmlImage: HTMLImageElement, objectFit: string = 'cover'): void {
  if (!objectFit || objectFit === 'cover') {
    const imgRatio = htmlImage.naturalWidth / htmlImage.naturalHeight;
    
    // Obtener dimensiones del contenedor según la forma
    let containerWidth: number, containerHeight: number;
    
    if (konvaImage instanceof Konva.Group) {
      // Para grupos, usar el primer hijo como referencia
      const firstChild = konvaImage.children?.[0];
      if (firstChild) {
        containerWidth = firstChild.width();
        containerHeight = firstChild.height();
      } else {
        return; // No se pueden obtener dimensiones
      }
    } else {
      containerWidth = konvaImage.width();
      containerHeight = konvaImage.height();
    }
    
    const containerRatio = containerWidth / containerHeight;
    
    if (imgRatio > containerRatio) {
      // Imagen más ancha - ajustar por altura
      const newWidth = containerHeight * imgRatio;
      if (konvaImage instanceof Konva.Group) {
        konvaImage.children?.forEach(child => {
          if ('width' in child) {
            (child as any).width(newWidth);
          }
        });
      } else {
        konvaImage.width(newWidth);
      }
    } else {
      // Imagen más alta - ajustar por ancho
      const newHeight = containerWidth / imgRatio;
      if (konvaImage instanceof Konva.Group) {
        konvaImage.children?.forEach(child => {
          if ('height' in child) {
            (child as any).height(newHeight);
          }
        });
      } else {
        konvaImage.height(newHeight);
      }
    }
  }
}


private crearFormaDesdePlantilla(elemento: any): Konva.Shape | null {
  const forma = elemento.configuracion.forma || 'rectangulo';
  
  switch (forma) {
    case 'circulo':
      return new Konva.Circle({
        x: elemento.x + elemento.width / 2,
        y: elemento.y + elemento.height / 2,
        radius: Math.min(elemento.width, elemento.height) / 2,
        fill: elemento.configuracion.fill,
        stroke: elemento.configuracion.stroke,
        strokeWidth: elemento.configuracion.strokeWidth,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      
    case 'rectangulo':
      return new Konva.Rect({
        x: elemento.x,
        y: elemento.y,
        width: elemento.width,
        height: elemento.height,
        fill: elemento.configuracion.fill,
        stroke: elemento.configuracion.stroke,
        strokeWidth: elemento.configuracion.strokeWidth,
        cornerRadius: elemento.configuracion.cornerRadius || 0,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      
    case 'estrella':
      return new Konva.Star({
        x: elemento.x + elemento.width / 2,
        y: elemento.y + elemento.height / 2,
        numPoints: 5,
        innerRadius: Math.min(elemento.width, elemento.height) * 0.4,
        outerRadius: Math.min(elemento.width, elemento.height) / 2,
        fill: elemento.configuracion.fill,
        stroke: elemento.configuracion.stroke,
        strokeWidth: elemento.configuracion.strokeWidth,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      
    case 'rombo':
      const points = [
        elemento.x + elemento.width / 2, elemento.y, // top
        elemento.x + elemento.width, elemento.y + elemento.height / 2, // right
        elemento.x + elemento.width / 2, elemento.y + elemento.height, // bottom
        elemento.x, elemento.y + elemento.height / 2 // left
      ];
      return new Konva.Line({
        points: points,
        fill: elemento.configuracion.fill,
        stroke: elemento.configuracion.stroke,
        strokeWidth: elemento.configuracion.strokeWidth,
        closed: true,
        rotation: elemento.configuracion.rotation || 0,
        visible: elemento.visible !== false
      });
      
    default:
      return null;
  }
}
private crearElementoLink(elemento: any, event: TimelineEvent): Konva.Text {
  const tieneEnlace = !!event.link;
  const textoLink = tieneEnlace ? 
    (elemento.configuracion?.textoLink || 'Ver más') : 
    'Agregar enlace...';
  
  const color = elemento.configuracion?.color || (tieneEnlace ? '#3498db' : '#95a5a6');
  
  const textElement = new Konva.Text({
    x: elemento.x,
    y: elemento.y,
    text: textoLink,
    fontSize: elemento.configuracion?.fontSize || 11,
    fontFamily: elemento.configuracion?.fontFamily || 'Arial',
    fill: color,
    align: elemento.configuracion?.textAlign || 'left',
    width: elemento.width,
    height: elemento.height,
    textDecoration: tieneEnlace ? 'underline' : 'none',
    rotation: elemento.configuracion?.rotation || 0,
    visible: elemento.visible !== false
  });

  // Configurar interactividad para enlaces
  if (tieneEnlace) {
    textElement.on('click', (e) => {
      e.cancelBubble = true;
      this.abrirEnlace(event.link!);
    });

    textElement.on('mouseenter', () => {
      this.stage.container().style.cursor = 'pointer';
      textElement.fill('#2980b9');
      this.mainLayer.batchDraw();
    });

    textElement.on('mouseleave', () => {
      this.stage.container().style.cursor = 'default';
      textElement.fill(color);
      this.mainLayer.batchDraw();
    });
  }

  return textElement;
}

private obtenerTextoParaEnlace(elemento: any, event: TimelineEvent): string {
  // Si hay un enlace en el evento, usar texto específico
  if (event.link) {
    return elemento.configuracion?.textoLink || 'Ver más' || 'Ver más';
  }
  
  // Si no hay enlace, mostrar texto indicativo
  return elemento.configuracion?.texto || 'Agregar enlace...';
}

private abrirEnlace(url: string): void {
  if (!url) return;
  
  // Asegurar que la URL tenga protocolo
  let urlCompleta = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    urlCompleta = 'https://' + url;
  }
  
  // Abrir en nueva pestaña
  window.open(urlCompleta, '_blank');
}

private crearTextoDesdePlantilla(elemento: any, texto: string): Konva.Text {
  return new Konva.Text({
    x: elemento.x,
    y: elemento.y,
    text: texto || elemento.configuracion.texto,
    fontSize: elemento.configuracion.fontSize,
    fontFamily: elemento.configuracion.fontFamily,
    fill: elemento.configuracion.color,
    fontStyle: elemento.configuracion.fontWeight,
    align: elemento.configuracion.textAlign as any,
    width: elemento.width,
    height: elemento.height,
    rotation: elemento.configuracion.rotation || 0,
    visible: elemento.visible
  });
}

private crearContenedorDesdePlantilla(elemento: any): Konva.Rect {
  return new Konva.Rect({
    x: elemento.x,
    y: elemento.y,
    width: elemento.width,
    height: elemento.height,
    fill: elemento.configuracion.fill,
    stroke: elemento.configuracion.stroke,
    strokeWidth: elemento.configuracion.strokeWidth,
    cornerRadius: elemento.configuracion.cornerRadius,
    rotation: elemento.configuracion.rotation || 0,
    visible: elemento.visible
  });
}

private updateEventPosition(event: TimelineEvent, x: number, y: number): void {
  // ✅ SIEMPRE guardar la posición actual como posicionLibre
  (event as any)['posicionLibre'] = { x, y };
  
  if (this.autoUpdateYears) {
    const newYear = this.calculateYearFromPosition(x, y);
    event.year = newYear;
    this.timelineEvents.sort((a, b) => a.year - b.year);
    
    // ✅ Al ordenar, NO re-renderizar todo, solo actualizar el año visualmente
    this.actualizarYearVisualmente(event);
  } else {
    console.log(`📍 Evento "${event.title}" guardó nueva posición (${x}, ${y})`);
  }
}

private actualizarYearVisualmente(event: TimelineEvent): void {
  const grupos = this.mainLayer.find('Group');
  
  for (let i = 0; i < grupos.length; i++) {
    const grupo = grupos[i] as Konva.Group;
    const eventoAsociado = grupo.getAttr('timelineEvent');
    
    if (eventoAsociado && 
        eventoAsociado.title === event.title && 
        eventoAsociado.year !== event.year) {
      
      // Actualizar el año en el texto del evento
      grupo.children?.forEach((child: Konva.Node) => {
        if (child instanceof Konva.Text) {
          const texto = child.text();
          // Buscar el texto que parece un año (4 dígitos)
          if (/^\d{4}$/.test(texto)) {
            child.text(event.year.toString());
          }
        }
      });
      
      // Actualizar la referencia del evento
      grupo.setAttr('timelineEvent', event);
      
      this.mainLayer.batchDraw();
      break;
    }
  }
}


private calculateEventPosition(year: number): { x: number; y: number } | null {
  const range = this.maxYear - this.minYear;
  const progress = (year - this.minYear) / range;
  const layout = this.currentTimelineDesign.layout;

  switch (layout.type) {
    case 'horizontal':
      return this.calculateHorizontalPosition(progress);
    
    case 'vertical':
      return this.calculateVerticalPosition(progress);
    
    case 'curve':
      return this.calculateCurvePosition(progress);
    
    case 'wave':
      return this.calculateWavePosition(progress);
    
    case 'zigzag':
      return this.calculateZigzagPosition(progress);
    
    case 'spiral':
      return this.calculateSpiralPosition(progress);
    case 's-curve': // ✅ NUEVO
      return this.calculateSCurvePosition(progress);
    
    case 'custom': // ✅ NUEVO
      return this.calculateCustomPosition(progress);
    
    default:
      return this.calculateHorizontalPosition(progress);
  }
}

/**
 * ✅ NUEVO: Calcular posición en S-Curve
 */
private calculateSCurvePosition(progress: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
  
  const centerX = (layout.positionX || this.stage.width() / 2) + 100;
  const centerY = layout.positionY || this.stage.height() / 2;
  const curveHeight = (layout.intensitycurva || 100) * 2;
  
  const totalWidth = layout.anchoTotal || 1110;
  const halfWidth = totalWidth / 2;
  const startX = centerX - halfWidth;

  // Dividir la S-curve en 3 segmentos
  let x: number, y: number;

  if (progress < 0.33) {
    // Primer segmento: línea superior horizontal
    const segmentProgress = progress / 0.33;
    x = startX + (totalWidth * 0.7) * segmentProgress;
    y = centerY - curveHeight;
  } else if (progress < 0.66) {
    // Segundo segmento: curva descendente + línea media
    const segmentProgress = (progress - 0.33) / 0.33;
    x = startX + totalWidth * 0.7 - (totalWidth * 0.65) * segmentProgress;
    y = centerY - curveHeight + (curveHeight * segmentProgress);
  } else {
    // Tercer segmento: curva ascendente + línea inferior
    const segmentProgress = (progress - 0.66) / 0.34;
    x = startX + totalWidth * 0.05 + (totalWidth * 0.72) * segmentProgress;
    y = centerY + curveHeight;
  }

  return { x, y };
}

/**
 * ✅ NUEVO: Calcular posición en línea personalizada
 */
private calculateCustomPosition(progress: number): { x: number; y: number } {
  // Para líneas personalizadas, usar distribución horizontal simple
  const x = 50 + (progress * (this.stage.width() - 100));
  const y = this.stage.height() / 2;
  return { x, y };
}


/**
 * ✅ NUEVO: Convertir configuración de línea de tiempo de Admin a formato de Usuario
 */
private convertirLineaTiempoConfig(lineaConfig: any): void {
  if (!lineaConfig || !lineaConfig.tipo) {
    console.warn('⚠️ Configuración de línea inválida:', lineaConfig);
    return;
  }

  const tipoMapeado = this.mapearTipoLinea(lineaConfig.tipo);
  
  if (!tipoMapeado) {
    console.error('❌ Tipo de línea no válido:', lineaConfig.tipo);
    return;
  }

  const customDesign: TimelineDesign = {
    id: 'custom-from-json',
    name: `Diseño Importado - ${lineaConfig.tipo}`,
    description: 'Diseño cargado desde JSON importado',
    layout: {
      type: tipoMapeado,
      orientation: this.calcularOrientacion(lineaConfig),
      positionX: lineaConfig.positionX !== undefined ? lineaConfig.positionX : this.stage.width() / 2,
      positionY: lineaConfig.positionY !== undefined ? lineaConfig.positionY : this.stage.height() / 2,
      intensity: lineaConfig.intensity || 20,
      intensitycurva: lineaConfig.intensitycurva || 100,
      anchoTotal: lineaConfig.anchoTotal || 1110,
      turns: lineaConfig.turns || 3,
      amplitude: lineaConfig.intensity || 30,
      frequency: lineaConfig.frequency || 0.02,
      segments: 20,
      curvature: 0.3
    },
    lineStyle: {
      stroke: lineaConfig.estilo?.stroke || '#070707ff',
      strokeWidth: lineaConfig.estilo?.strokeWidth || 5,
      strokeStyle: 'solid',
      lineCap: (lineaConfig.estilo?.lineCap as any) || 'round',
      dashArray: lineaConfig.estilo?.dash,
      shadow: {
        color: 'rgba(0,0,0,0.3)',
        blur: 8,
        offset: { x: 0, y: 3 },
        opacity: 0.5
      }
    },
    markers: [
      {
        type: 'year',
        position: 'both',
        interval: 10,
        style: {
          size: 4,
          color: lineaConfig.estilo?.stroke || '#070707ff',
          shape: 'line',
          label: {
            show: true,
            fontSize: 12,
            fontFamily: 'Arial',
            color: '#2c3e50',
            position: 'outside'
          }
        }
      }
    ]
  };

  this.currentTimelineDesign = customDesign;
  this.selectedTimelineDesignId = 'custom-from-json';
  
}


private mapearTipoLinea(
  tipoJSON: string
): "horizontal" | "vertical" | "curve" | "wave" | "zigzag" | "spiral" | "s-curve" | "custom" {
  const mapeo = {
    wave: "wave",
    horizontal: "horizontal",
    vertical: "vertical",
    curve: "curve",
    zigzag: "zigzag",
    spiral: "spiral",
    "s-curve": "s-curve",
    custom: "custom"
  } as const;

  return (mapeo[tipoJSON as keyof typeof mapeo] || "horizontal");
}

/**
 * ✅ Calcular orientación basada en posición
 */
private calcularOrientacion(lineaConfig: any): "top" | "bottom" | "center" | "left" | "right" {
  const posY = lineaConfig.positionY || this.stage.height() / 2;
  const posX = lineaConfig.positionX || this.stage.width() / 2;
  
  // Para líneas horizontales
  if (lineaConfig.tipo === 'horizontal' || lineaConfig.tipo === 'wave' || lineaConfig.tipo === 'zigzag') {
    if (posY < this.stage.height() * 0.33) return 'top';
    if (posY > this.stage.height() * 0.66) return 'bottom';
    return 'center';
  }
  
  // Para líneas verticales
  if (lineaConfig.tipo === 'vertical') {
    if (posX < this.stage.width() * 0.33) return 'left';
    if (posX > this.stage.width() * 0.66) return 'right';
    return 'center';
  }
  
  return 'center';
}
private calculateHorizontalPosition(progress: number): { x: number; y: number } {
  const x = 50 + (progress * (this.stage.width() - 100));
  const y = this.getTimelineYPosition();
  return { x, y };
}

private calculateVerticalPosition(progress: number): { x: number; y: number } {
  const x = this.getTimelineXPosition();
  const y = 100 + (progress * (this.stage.height() - 200));
  return { x, y };
}

private calculateCurvePosition(progress: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
  const curvature = layout.curvature || 0.3;

  const startX = 50;
  const endX = this.stage.width() - 50;
  const centerY = this.stage.height() / 2;
  const controlY = centerY + (this.stage.height() * curvature);

  // Calcular posición en curva Bézier
  const t = progress;
  const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + endX) / 2) + t * t * endX;
  const y = (1 - t) * (1 - t) * centerY + 2 * (1 - t) * t * controlY + t * t * centerY;

  return { x, y };
}

private calculateWavePosition(progress: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
  const amplitude = layout.amplitude || 30;
  const frequency = layout.frequency || 0.02;

  const centerY = this.stage.height() / 2;
  const x = 50 + (progress * (this.stage.width() - 100));
  const y = centerY + Math.sin(x * frequency) * amplitude;

  return { x, y };
}

private calculateZigzagPosition(progress: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
  const amplitude = layout.amplitude || 40;
  const segments = layout.segments || 20;

  const centerY = this.stage.height() / 2;
  const segmentIndex = Math.floor(progress * segments);
  const segmentProgress = (progress * segments) - segmentIndex;

  const x = 50 + (progress * (this.stage.width() - 100));
  const baseY = segmentIndex % 2 === 0 ? centerY - amplitude : centerY + amplitude;
  const nextY = (segmentIndex + 1) % 2 === 0 ? centerY - amplitude : centerY + amplitude;
  const y = baseY + (segmentProgress * (nextY - baseY));

  return { x, y };
}

private calculateSpiralPosition(progress: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
  const segments = layout.segments || 36;

  const centerX = this.stage.width() / 2;
  const centerY = this.stage.height() / 2;
  const maxRadius = Math.min(centerX, centerY) - 50;

  const angle = progress * Math.PI * 4; // 2 vueltas completas
  const radius = progress * maxRadius;

  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  return { x, y };
}

private getDragBoundPosition(pos: { x: number; y: number }, originalY: number,originalX?: number): { x: number; y: number } {
  const layout = this.currentTimelineDesign.layout;
//para mover libremente
  /* if (!this.autoUpdateYears) {
    return { x: pos.x, y: pos.y };
  }*/
  
  switch (layout.type) {
    case 'horizontal':
      // Solo movimiento horizontal en la línea
      return { x: pos.x, y: originalY };
    
    case 'vertical':
      // Solo movimiento vertical en la línea
    const xFinal = originalX !== undefined ? originalX : this.getTimelineXPosition();
      return { x: xFinal, y: pos.y };
    case 's-curve':return{ x: pos.x, y: pos.y }; 
    case 'curve':
    case 'wave':
    case 'zigzag':
      // Para líneas curvas, permitir movimiento más libre pero mantener proximidad a la línea
      return this.getCurvedDragBound(pos, originalY);
    
    case 'spiral':
      // Para espiral, movimiento más libre
      return { x: pos.x, y: pos.y };
    
    default:
      return { x: pos.x, y: originalY };
  }
}

private getCurvedDragBound(pos: { x: number; y: number }, originalY: number): { x: number; y: number } {
  // Para líneas curvas, permitir movimiento pero con restricciones suaves
  const maxDeviation = 50; // Máxima desviación permitida de la línea original
  
  // Calcular la Y esperada para esta X en la línea
  const expectedY = this.calculateExpectedY(pos.x);
  
  if (Math.abs(pos.y - expectedY) > maxDeviation) {
    // Si se desvía demasiado, corregir la posición
    const direction = pos.y > expectedY ? 1 : -1;
    return { x: pos.x, y: expectedY + (maxDeviation * direction) };
  }
  
  return { x: pos.x, y: pos.y };
}
private calculateExpectedY(x: number): number {
  const layout = this.currentTimelineDesign.layout;
  const progress = (x - 50) / (this.stage.width() - 100);
  
  switch (layout.type) {
    case 'curve':
      return this.calculateCurvePosition(progress).y;
    case 'wave':
      return this.calculateWavePosition(progress).y;
    case 'zigzag':
      return this.calculateZigzagPosition(progress).y;
    default:
      return this.stage.height() / 2;
  }
}

 getLayoutTypeName(type: string): string {
    const names: { [key: string]: string } = {
      'horizontal': 'Horizontal',
      'vertical': 'Vertical', 
      'curve': 'Curva',
      'wave': 'Ondulada',
      'zigzag': 'Zigzag',
      'spiral': 'Espiral'
    };
    return names[type] || type;
  }

 

  // Método para cambiar el diseño de eventos
   changeEventDesign(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const designId = selectElement.value;
    
    if (designId) {
      const design = this.eventDesignService.getEventDesignById(designId);
      if (design) {
        this.currentEventDesign = design;
        this.renderTimelineEvents();
        console.log('✅ Diseño cambiado a:', design.name);
      }
    }
  }



  private agregarElementoLinkAlEvento(group: Konva.Group, event: TimelineEvent): void {
  const linkText = new Konva.Text({
    x: -45,
    y: 125, // Posición debajo del título
    text: '🔗 Ver más',
    fontSize: 10,
    fontFamily: 'Arial',
    fill: '#3498db',
    width: 90,
    align: 'center',
    textDecoration: 'underline'
  });

  // Configurar interactividad del enlace
  linkText.on('click', (e) => {
    e.cancelBubble = true;
    this.abrirEnlace(event.link!);
  });

  linkText.on('mouseenter', () => {
    this.stage.container().style.cursor = 'pointer';
    linkText.fill('#2980b9'); // Color más oscuro al hover
    group.getLayer()?.batchDraw();
  });

  linkText.on('mouseleave', () => {
    this.stage.container().style.cursor = 'default';
    linkText.fill('#3498db');
    group.getLayer()?.batchDraw();
  });

  // Guardar referencia al enlace
  linkText.setAttr('linkUrl', event.link);
  
  group.add(linkText);
}
  
  // ========== MÉTODOS DE EVENTOS ==========
  editEvent(event: TimelineEvent): void {
    this.selectedEvent = event;
    this.editedEvent = { ...event };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedEvent = null;
    this.resetEditedEvent();
  }

  resetEditedEvent(): void {
    this.editedEvent = {
      year: 0,
      title: '',
      person: '',
      description: '',
      image: '',
      link: ''
    };
  }


  

  updateEvent(): void {
  if (!this.editedEvent.year || !this.editedEvent.title) {
    alert('Por favor, complete al menos el año y el título del evento.');
    return;
  }

  if (this.selectedEvent) {
    // ✅ Guardar la posición actual antes de actualizar
    const posicionActual = (this.selectedEvent as any)['posicionLibre'];
    
    // Actualizar los datos del evento
    Object.assign(this.selectedEvent, this.editedEvent);
    
    // ✅ Mantener la posición guardada
    if (posicionActual) {
      (this.selectedEvent as any)['posicionLibre'] = posicionActual;
    }
    
    // Buscar el grupo visual del evento y actualizarlo
    this.actualizarEventoVisualmente(this.selectedEvent);
    
    // Solo recalcular años si es necesario
    this.timelineEvents.sort((a, b) => a.year - b.year);
    this.calculateYearRange();
    
    this.closeEditModal();
  }
}

private actualizarEventoVisualmente(event: TimelineEvent): void {
  const grupos = this.mainLayer.find('Group');
  
  for (let i = 0; i < grupos.length; i++) {
    const grupo = grupos[i] as Konva.Group;
    const eventoAsociado = grupo.getAttr('timelineEvent');
    
    if (eventoAsociado && 
        eventoAsociado.title === this.editedEvent.title) {
      
      // Actualizar todos los textos del evento
      grupo.children?.forEach((child: Konva.Node) => {
        if (child instanceof Konva.Text) {
          const texto = child.text();
          
          // Actualizar año
          if (/^\d{4}$/.test(texto)) {
            child.text(event.year.toString());
          }
          // Actualizar título (buscar texto con "bold")
          else if (child.fontStyle() === 'bold') {
            child.text(event.title);
          }
          // Actualizar descripción
          else if (child.fontSize() < 12 && !texto.includes('🔗')) {
            child.text(event.description || 'Descripción del evento...');
          }
        }
        
        // Actualizar imagen si existe
        if (child instanceof Konva.Image || child instanceof Konva.Circle) {
          if (event.image) {
            this.actualizarImagenEvento(child, event.image);
          }
        }
      });
      
      // Actualizar referencia del evento
      grupo.setAttr('timelineEvent', event);
      
      this.mainLayer.batchDraw();
      break;
    }
  }
}

private actualizarImagenEvento(nodoImagen: Konva.Shape, nuevaImagenUrl: string): void {
  const imageObj = new Image();
  imageObj.crossOrigin = 'Anonymous';
  
  imageObj.onload = () => {
    if (nodoImagen instanceof Konva.Image) {
      nodoImagen.image(imageObj);
    } else if (nodoImagen instanceof Konva.Circle) {
      nodoImagen.fillPatternImage(imageObj);
    }
    this.mainLayer.batchDraw();
  };
  
  imageObj.onerror = () => {
    console.error('Error cargando nueva imagen:', nuevaImagenUrl);
  };
  
  imageObj.src = nuevaImagenUrl;
}

 async onEditImageSelected(event: any): Promise<void> {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona un archivo de imagen');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 10MB.');
    return;
  }

  try {
    if (this.proyectoActualId) {
      // PROYECTO EXISTENTE: Subir directamente
      const usuario = this.authService.getCurrentUser();
      if (!usuario || !usuario.id) {
        throw new Error('Usuario no autenticado');
      }

      const respuesta = await lastValueFrom(
        this.archivoService.subirAssetProyectoUser(file, usuario.id, this.proyectoActualId)
      );

      this.editedEvent.image = this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
      console.log('✅ Imagen editada subida a proyecto existente');
      
    } else {
      // PROYECTO NUEVO: Data URL temporal
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editedEvent.image = e.target.result;
      };
      reader.readAsDataURL(file);
    }

  } catch (error) {
    console.error('❌ Error procesando imagen editada:', error);
    
    // Fallback a Data URL
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.editedEvent.image = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}


  removeImage(): void {
    this.editedEvent.image = '';
  }

  deleteEvent(): void {
  if (this.selectedEvent && confirm('¿Está seguro de que desea eliminar este evento?')) {
    const index = this.timelineEvents.indexOf(this.selectedEvent);
    
    if (index > -1) {
      // ✅ Eliminar solo el grupo visual del evento eliminado
      this.eliminarEventoVisualmente(this.selectedEvent);
      
      // Eliminar del array
      this.timelineEvents.splice(index, 1);
      
      // Recalcular rango
      this.calculateYearRange();
      
      // Redibujar
      this.mainLayer.batchDraw();
      
      this.closeEditModal();
    }
  }
}

private eliminarEventoVisualmente(event: TimelineEvent): void {
  const grupos = this.mainLayer.find('Group');
  
  for (let i = 0; i < grupos.length; i++) {
    const grupo = grupos[i] as Konva.Group;
    const eventoAsociado = grupo.getAttr('timelineEvent');
    
    if (eventoAsociado && 
        eventoAsociado.year === event.year && 
        eventoAsociado.title === event.title) {
      
      // Eliminar transformer si existe
      const transformer = grupo.getAttr('myTransformer');
      if (transformer) {
        transformer.destroy();
      }
      
      // Eliminar el grupo
      grupo.destroy();
      
      console.log(`🗑️ Evento "${event.title}" eliminado visualmente`);
      break;
    }
  }
}

  // ========== MÉTODOS UTILITARIOS ==========
  truncateText(text: string, maxWidth: number): string {
    if (text.length <= 30) return text;
    return text.substring(0, 10) + '...';
  }

 updateEventYear(event: TimelineEvent, xPosition: number,yPosition:number): void {
  if (this.autoUpdateYears) {
    // Comportamiento original: actualizar año basado en posición X
    const newYear = this.calculateYearFromPosition(xPosition,yPosition);
    event.year = newYear;
    this.timelineEvents.sort((a, b) => a.year - b.year);
    this.renderTimelineEvents();
  } else {
    // Comportamiento nuevo: mantener el año original, pero permitir movimiento libre
    // No hacemos nada aquí, el evento mantiene su año original
    console.log(`Evento "${event.title}" mantiene año ${event.year} (movimiento libre)`);
    
    // Opcional: Podemos forzar un re-render para asegurar que se vea bien
    // pero sin cambiar la posición lógica del evento
    this.actualizarPosicionVisualEvento(event);
  }
}


onAutoUpdateChange(): void {
  console.log(`Auto-update years: ${this.autoUpdateYears}`);
  
  // Si se desactiva el auto-update, re-renderizar para permitir movimiento libre
  if (!this.autoUpdateYears) {
    this.renderTimelineEvents();
  }
}


private actualizarPosicionVisualEvento(event: TimelineEvent): void {
  // Encontrar el grupo correspondiente a este evento
  const grupoEvento = this.mainLayer.findOne((node: Konva.Node) => {
    return node.getClassName() === 'Group' && 
           node.getAttr('timelineEvent') === event;
  });

  if (grupoEvento && grupoEvento instanceof Konva.Group) {
    // Si autoUpdateYears está desactivado, el evento puede estar en cualquier posición X
    // pero queremos que el texto del año se mantenga visible
    const yearText = grupoEvento.findOne((node: Konva.Node) => {
      return node.getClassName() === 'Text' && 
             node.getAttr('text') === event.year.toString();
    });

    if (yearText && yearText instanceof Konva.Text) {
      yearText.text(event.year.toString());
    }
    
    this.mainLayer.batchDraw();
  }
}






mostrarMenuExportar = false;

toggleExportMenu() {
  this.mostrarMenuExportar = !this.mostrarMenuExportar;
}


compartirProyecto() {
  this.mostrarMenuExportar = false;
  // Tu lógica para compartir (por ejemplo copiar enlace)
  const link = window.location.href;
  navigator.clipboard.writeText(link);
  alert("🔗 Enlace copiado al portapapeles");
}

 private calculateYearFromPosition(x: number, y: number): number {
  const layout = this.currentTimelineDesign.layout;
  const range = this.maxYear - this.minYear;
  
  switch (layout.type) {
    case 'horizontal':
      const effectiveWidth = this.stage.width() - 100;
      const normalizedX = x - 50;
      const percentage = normalizedX / effectiveWidth;
      return Math.round(this.minYear + percentage * range);
    
    case 'vertical':
      const effectiveHeight = this.stage.height() - 200;
      const normalizedY = y - 100;
      const percentageY = normalizedY / effectiveHeight;
      return Math.round(this.minYear + percentageY * range);
    
    case 'curve':
    case 'wave':
    case 'zigzag':
      // Para líneas curvas, usar la posición X como referencia principal
      const progressX = (x - 50) / (this.stage.width() - 100);
      return Math.round(this.minYear + progressX * range);
    
    case 'spiral':
      // Para espiral, calcular basado en el ángulo
      const centerX = this.stage.width() / 2;
      const centerY = this.stage.height() / 2;
      const angle = Math.atan2(y - centerY, x - centerX);
      // Normalizar ángulo de 0 a 1 (0 a 2π)
      let normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
      return Math.round(this.minYear + normalizedAngle * range);
    
    default:
      const defaultProgress = (x - 50) / (this.stage.width() - 100);
      return Math.round(this.minYear + defaultProgress * range);
  }
}

  openEventModal(): void {
    this.showEventModal = true;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.resetNewEvent();
  }

  resetNewEvent(): void {
    this.newEvent = {
      year: 0,
      title: '',
      person: '',
      description: '',
      image: '',
      link: '' 
    };
  }

addEventToTimeline(): void {
  if (!this.newEvent.year || !this.newEvent.title) {
    alert('Por favor, complete al menos el año y el título del evento.');
    return;
  }

  const nuevoOrden = this.timelineEvents.length + 1;
  
  // ASIGNAR DISEÑO BASADO EN EL PATRÓN CÍCLICO
  if (this.zonasPlantilla.length > 0) {
    const diseñoBase = this.obtenerPatronDiseño(nuevoOrden);
    if (diseñoBase) {
      const nuevaX = this.calcularNuevaPosicionX(nuevoOrden);
      
      (this.newEvent as any)['zonaDesign'] = {
        ...JSON.parse(JSON.stringify(diseñoBase)),
        id: `zone-${nuevoOrden}`,
        nombre: `Evento ${nuevoOrden}`,
        orden: nuevoOrden,
        posicion: {
          ...diseñoBase.posicion,
          x: nuevaX
        }
      };
      
      // ✅ Guardar posición inicial como posicionLibre
      (this.newEvent as any)['posicionLibre'] = {
        x: nuevaX,
        y: diseñoBase.posicion.y
      };
    }
  } else {
    // Fallback si no hay plantilla cargada
    this.duplicarDiseñoParaNuevoEvento();
    if (this.nuevoEventoDesign) {
      (this.newEvent as any)['zonaDesign'] = this.nuevoEventoDesign;
      (this.newEvent as any)['posicionLibre'] = {
        x: this.nuevoEventoDesign.posicion.x,
        y: this.nuevoEventoDesign.posicion.y
      };
      this.nuevoEventoDesign = null;
    }
  }

  // Agregar el evento al array
  const eventoNuevo = {...this.newEvent};
  this.timelineEvents.push(eventoNuevo);
  
  // ✅ SOLO RENDERIZAR EL NUEVO EVENTO, NO TODOS
  this.createTimelineEvent(eventoNuevo);
  
  // Actualizar rango de años si es necesario
  this.calculateYearRange();
  
  // Redibujar el layer
  this.mainLayer.batchDraw();
  
  this.closeEventModal();
  
  console.log(`✅ Evento "${eventoNuevo.title}" agregado sin re-renderizar eventos existentes`);
}

private limpiarPlantillaAnterior(): void {
  this.zonasPlantilla = [];
  this.timelineEvents = [];
  this.limpiarCompletamenteLineaTiempo();
  console.log('🧹 Plantilla anterior limpiada');
}

private obtenerTotalZonasPlantilla(): number {
  // Buscar en la plantilla cargada cuántas zonas de eventos tiene
  // Esto debería venir de tu plantilla actualmente cargada
  const plantillaActual = this.plantillasDisponibles.find(p => 
    p.nombre === this.proyectoNombre // o algún otro identificador
  );
  
  if (plantillaActual && plantillaActual.configuracionVisual?.zonasEventos) {
    return plantillaActual.configuracionVisual.zonasEventos.length;
  }
  
  // Fallback: asumir 3 zonas por defecto (como en tu ejemplo)
 return this.zonasPlantilla.length || 3; // Fallback a 3 si no hay zonas
}


private nuevoEventoDesign: any = null;

/*private duplicarDiseñoParaNuevoEvento(): void {
  const nuevoOrden = this.timelineEvents.length + 1;
  
  // ✅ PRIMERO intentar usar zonas de plantilla
  if (this.zonasPlantilla.length > 0) {
    const ultimaZona = this.zonasPlantilla[this.zonasPlantilla.length - 1];
    this.crearNuevaZonaDesdePlantilla(ultimaZona, nuevoOrden);
  } 
  // ✅ SEGUNDO intentar usar el último evento existente
  else if (this.timelineEvents.length > 0) {
    const ultimoEvento = this.timelineEvents[this.timelineEvents.length - 1];
    if (ultimoEvento && (ultimoEvento as any)['zonaDesign']) {
      const zonaDesign = (ultimoEvento as any)['zonaDesign'];
      this.crearNuevaZonaDesdeExistente(zonaDesign, nuevoOrden);
    } else {
      this.crearDiseñoPorDefecto(nuevoOrden);
    }
  } 
  // ✅ ÚLTIMO recurso: diseño por defecto
  else {
    this.crearDiseñoPorDefecto(nuevoOrden);
  }
}*/

private duplicarDiseñoParaNuevoEvento(): void {
  const nuevoOrden = this.timelineEvents.length + 1;
  
  // Obtener el patrón de diseño cíclico
  const diseñoBase = this.obtenerPatronDiseño(nuevoOrden);
  
  if (diseñoBase) {
    this.crearNuevaZonaDesdePlantillaConPosicion(diseñoBase, nuevoOrden);
  } else {
    this.crearDiseñoPorDefecto(nuevoOrden);
  }
}

private crearNuevaZonaDesdePlantillaConPosicion(diseñoBase: any, nuevoOrden: number): void {
  const nuevaX = this.calcularNuevaPosicionX(nuevoOrden);
  
  const nuevaZona = {
    ...JSON.parse(JSON.stringify(diseñoBase)), // Deep clone
    id: `zone-${nuevoOrden}`,
    nombre: `Evento ${nuevoOrden}`,
    orden: nuevoOrden,
    posicion: {
      ...diseñoBase.posicion,
      x: nuevaX,
      // Mantener la misma Y
      y: diseñoBase.posicion.y
    }
  };
  
  this.nuevoEventoDesign = nuevaZona;
  console.log(`🔄 Creando evento ${nuevoOrden} con diseño ${(nuevoOrden - 1) % this.zonasPlantilla.length + 1} en X: ${nuevaX}`);
}

private crearNuevaZonaDesdePlantilla(zonaBase: any, nuevoOrden: number): void {
  const nuevaZona = {
    ...JSON.parse(JSON.stringify(zonaBase)), // Deep clone
    id: `zone-${nuevoOrden}`,
    nombre: `Evento ${nuevoOrden}`,
    orden: nuevoOrden,
    posicion: {
      ...zonaBase.posicion,
      x: this.calcularNuevaPosicionX(nuevoOrden)
    }
  };
  
  this.nuevoEventoDesign = nuevaZona;
  console.log(`🔄 Duplicando zona de plantilla para evento ${nuevoOrden}`);
}

private crearNuevaZonaDesdeExistente(zonaDesign: any, nuevoOrden: number): void {
  const nuevaZona = {
    ...JSON.parse(JSON.stringify(zonaDesign)), // Deep clone
    id: `zone-${nuevoOrden}`,
    nombre: `Evento ${nuevoOrden}`,
    orden: nuevoOrden,
    posicion: {
      ...zonaDesign.posicion,
      x: this.calcularNuevaPosicionX(nuevoOrden)
    }
  };
  
  this.nuevoEventoDesign = nuevaZona;
  console.log(`🔄 Duplicando diseño existente para evento ${nuevoOrden}`);
}



private crearDiseñoPorDefecto(nuevoOrden: number): void {
  this.nuevoEventoDesign = {
    id: `zone-${nuevoOrden}`,
    nombre: `Evento ${nuevoOrden}`,
    posicion: {
      x: this.calcularNuevaPosicionX(nuevoOrden),
      y: 298,
      anchoMaximo: 195,
      altoMaximo: 294
    },
    elementos: this.obtenerElementosBase(),
    contenedor: {
      visible: false
    },
    orden: nuevoOrden
  };
  console.log(`⚪ Usando diseño por defecto para evento ${nuevoOrden}`);
}

private obtenerElementosBase(): any[] {
  // Retorna una copia de los elementos base de un evento
  // Esto debería coincidir con la estructura de tu plantilla
  return [
    {
      "id": `elem-${Date.now()}-contenedor`,
      "tipo": "contenedor",
      "visible": true,
      "x": 24,
      "y": 150,
      "width": 141,
      "height": 127,
      "configuracion": {
        "forma": "rectangulo",
        "fill": "#ffffff",
        "stroke": "#000000",
        "strokeWidth": 2,
        "cornerRadius": 4,
        "rotation": 0
      },
      "restricciones": {
        "movable": true,
        "resizable": true,
        "rotatable": true
      }
    },
    // ... agregar los demás elementos (imagen, título, fecha, etc.)
    // siguiendo la misma estructura de tu plantilla
  ];
}

private calcularNuevaPosicionX(orden: number): number {
  // Si es uno de los primeros 3 eventos, usar posición original de la plantilla
  if (orden <= this.zonasPlantilla.length && this.zonasPlantilla[orden - 1]) {
    return this.zonasPlantilla[orden - 1].posicion.x;
  }
  
  // Calcular la diferencia constante entre eventos
  const diferenciaX = this.calcularDiferenciaX();
  
  // Para eventos adicionales, continuar el patrón desde el último evento
  const ultimoEventoConDiseño = this.timelineEvents[this.timelineEvents.length - 1];
  let ultimaPosicionX = 730; // Valor por defecto (evento 3)
  
  if (ultimoEventoConDiseño && (ultimoEventoConDiseño as any)['zonaDesign']) {
    ultimaPosicionX = (ultimoEventoConDiseño as any)['zonaDesign'].posicion.x;
  }
  
  // Calcular nueva posición sumando la diferencia
  return ultimaPosicionX + diferenciaX;
}

private calcularDiferenciaX(): number {
  // Calcular la diferencia promedio entre los eventos de la plantilla
  if (this.zonasPlantilla.length >= 2) {
    const diferencias: number[] = [];
    
    for (let i = 1; i < this.zonasPlantilla.length; i++) {
      const diff = this.zonasPlantilla[i].posicion.x - this.zonasPlantilla[i - 1].posicion.x;
      diferencias.push(diff);
    }
    
    // Retornar el promedio de las diferencias
    const promedio = diferencias.reduce((sum, diff) => sum + diff, 0) / diferencias.length;
    return Math.round(promedio);
  }
  
  // Fallback: usar diferencia de 300px (basado en tu ejemplo)
  return 300;
}

private obtenerPatronDiseño(orden: number): any {
  const totalZonas = this.zonasPlantilla.length;
  
  if (totalZonas === 0) {
    return null;
  }
  
  // Para eventos 1, 2, 3 usar diseños 1, 2, 3
  // Para eventos 4, 5, 6 usar diseños 1, 2, 3 nuevamente (patrón cíclico)
  const indiceDiseño = (orden - 1) % totalZonas;
  return this.zonasPlantilla[indiceDiseño];
}



  calculateYearRange(): void {
    if (this.timelineEvents.length > 0) {
      this.minYear = Math.min(...this.timelineEvents.map(event => event.year));
      this.maxYear = Math.max(...this.timelineEvents.map(event => event.year));
      this.minYear = Math.max(1800, this.minYear - 10);
      this.maxYear = Math.min(2000, this.maxYear + 10);
    }
  }

  calculateCanvasPosition(year: number): number {
    const range = this.maxYear - this.minYear;
    return 50 + ((year - this.minYear) / range) * (this.stage.width() - 100);
  }


  async onImageSelected(event: any): Promise<void> {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona un archivo de imagen');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 10MB.');
    return;
  }

  try {
    // PARA PROYECTOS NUEVOS: Usar Data URL temporal
    // PARA PROYECTOS EXISTENTES: Subir directamente al servidor
    
    if (this.proyectoActualId) {
      // PROYECTO EXISTENTE: Subir directamente al servidor
      console.log('📤 Subiendo imagen a proyecto EXISTENTE...');
      const usuario = this.authService.getCurrentUser();
      if (!usuario || !usuario.id) {
        throw new Error('Usuario no autenticado');
      }

      const respuesta = await lastValueFrom(
        this.archivoService.subirAssetProyectoUser(file, usuario.id, this.proyectoActualId)
      );

      this.newEvent.image = this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
      console.log('✅ Imagen subida a proyecto existente');
      
    } else {
      // PROYECTO NUEVO: Usar Data URL temporal (se subirá después de guardar)
      console.log('💾 Guardando imagen temporalmente (Data URL)...');
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newEvent.image = e.target.result;
        console.log('✅ Imagen guardada temporalmente');
      };
      reader.readAsDataURL(file);
    }

  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    
    // Fallback: siempre usar Data URL si hay error
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newEvent.image = e.target.result;
    };
    reader.readAsDataURL(file);
    
    alert('Error al procesar la imagen. Se guardará temporalmente.');
  }
}




  changeBackgroundColor(color: string): void {
    this.updateBackgroundColor(color);
  }

  addEvent(): void {
    const currentYear = Math.round((this.minYear + this.maxYear) / 2);
    this.newEvent = {
      year: currentYear,
      title: 'Nuevo Evento',
      person: '',
      description: '',
      image: ''
    };
    this.openEventModal();
  }

 



  //########################################

async exportAsImage(): Promise<void> {
  try {
    if (!this.stage) {
      alert('Error: El editor no está listo para exportar');
      return;
    }

    console.log('🔄 Iniciando exportación...');

    // ✅ YA NO NECESITAMOS PRECARGAR porque las imágenes ya están en data URLs
    // Solo forzar un redraw para asegurar que todo esté visible
    
    this.stage.batchDraw();

    // Pequeña espera para asegurar el renderizado
    setTimeout(() => {
      try {
        const dataURL = this.stage.toDataURL({
          pixelRatio: 2, // ✅ Mejor calidad
          quality: 1,
          mimeType: 'image/png'
        });

        if (!dataURL || dataURL.length < 100) {
          throw new Error('Data URL inválida');
        }

        this.descargarDataURL(dataURL, `linea-tiempo-${new Date().getTime()}.png`);
        
        console.log('✅ Exportación exitosa');
        
      } catch (error) {
        console.error('❌ Error en exportación:', error);
        // Intentar con configuración más simple
        this.intentarExportacionSimple();
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ Error general en exportación:', error);
    alert('Error al exportar la imagen. Por favor, intenta nuevamente.');
  }
}

/**
 * ✅ NUEVO MÉTODO: Intentar exportación simple como fallback
 */
private intentarExportacionSimple(): void {
  try {
    this.stage.batchDraw();
    
    setTimeout(() => {
      const dataURL = this.stage.toDataURL({
        pixelRatio: 1,
        quality: 0.9,
        mimeType: 'image/jpeg'
      });

      this.descargarDataURL(dataURL, `linea-tiempo-${new Date().getTime()}.jpg`);
      console.log('✅ Exportación JPEG exitosa (fallback)');
    }, 50);
  } catch (error) {
    console.error('❌ Error incluso en exportación simple:', error);
    alert('❌ Error crítico: No se pudo exportar la imagen.');
  }
}

/**
 * ✅ NUEVO MÉTODO: Descargar data URL
 */
private descargarDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


private async prepararImagenesParaExportacion(): Promise<void> {
  return new Promise((resolve) => {
    let imagesToLoad = 0;
    let imagesLoaded = 0;

    // Buscar todas las imágenes en el stage
    const images: Konva.Image[] = [];
    
    this.stage.find('Image').forEach((node: Konva.Node) => {
      if (node instanceof Konva.Image) {
        images.push(node);
      }
    });

    // Buscar imágenes en grupos
    this.stage.find('Group').forEach((group: Konva.Node) => {
      if (group instanceof Konva.Group) {
        group.children?.forEach((child: Konva.Node) => {
          if (child instanceof Konva.Image) {
            images.push(child);
          }
        });
      }
    });

    // Buscar imágenes en eventos de timeline
    this.stage.find('Group').forEach((group: Konva.Node) => {
      if (group instanceof Konva.Group) {
        const hasConnector = group.children?.some(c => c instanceof Konva.Line);
        const hasYear = group.children?.some(c => 
          c instanceof Konva.Text && c.text().match(/^\d{4}$/)
        );
        
        if (hasConnector && hasYear) {
          group.children?.forEach((child: Konva.Node) => {
            if (child instanceof Konva.Image) {
              images.push(child);
            }
          });
        }
      }
    });

    imagesToLoad = images.length;

    // Si no hay imágenes, resolver inmediatamente
    if (imagesToLoad === 0) {
      resolve();
      return;
    }

    console.log(`🖼️ Preparando ${imagesToLoad} imágenes para exportación...`);

    const checkAllLoaded = () => {
      imagesLoaded++;
      console.log(`📊 Imágenes cargadas: ${imagesLoaded}/${imagesToLoad}`);
      
      if (imagesLoaded >= imagesToLoad) {
        console.log('✅ Todas las imágenes listas para exportación');
        resolve();
      }
    };

    images.forEach((imageNode: Konva.Image) => {
      const currentImage = imageNode.image();
      
      // ✅ CORRECCIÓN: Verificar el tipo específico antes de acceder a propiedades
      if (this.isImageLoaded(currentImage)) {
        checkAllLoaded();
        return;
      }

      // Si es una URL externa, crear una nueva imagen y cargarla
      const imageSrc = imageNode.getAttr('imageSrc') || '';
      
      if (imageSrc && (imageSrc.startsWith('http://') || imageSrc.startsWith('https://'))) {
        const newImage = new Image();
        newImage.crossOrigin = 'Anonymous';
        
        newImage.onload = () => {
          imageNode.image(newImage);
          this.stage.batchDraw();
          checkAllLoaded();
        };
        
        newImage.onerror = () => {
          console.error('❌ Error cargando imagen para exportación:', imageSrc);
          this.crearPlaceholderParaImagen(imageNode);
          checkAllLoaded();
        };
        
        newImage.src = imageSrc;
      } else {
        // Si no es URL externa o ya está cargada de otra forma
        checkAllLoaded();
      }
    });
  });
}

/**
 * ✅ NUEVO MÉTODO: Verificar si una imagen está cargada de manera segura
 */
private isImageLoaded(imageSource: CanvasImageSource | undefined): boolean {
  if (!imageSource) {
    return false;
  }

  // Verificar si es un elemento HTMLImageElement
  if (imageSource instanceof HTMLImageElement) {
    return imageSource.complete && imageSource.naturalHeight !== 0;
  }

  // Verificar si es un elemento HTMLCanvasElement (ya está "cargado")
  if (imageSource instanceof HTMLCanvasElement) {
    return true;
  }

   // Verificar si es un elemento HTMLVideoElement
  if (imageSource instanceof HTMLVideoElement) {
    // ✅ CORRECCIÓN: Usar la constante correctamente
    return imageSource.readyState >= 2; // HAVE_CURRENT_DATA = 2
  }

  // Para SVG y otros tipos, asumir que están cargados
  return true;
}

private crearPlaceholderParaImagen(imageNode: Konva.Image): void {
  const canvas = document.createElement('canvas');
  canvas.width = imageNode.width();
  canvas.height = imageNode.height();
  const ctx = canvas.getContext('2d')!;
  
  // Fondo gris
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Borde
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  
  // Texto
  ctx.fillStyle = '#666';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('❌ Imagen no disponible', canvas.width / 2, canvas.height / 2);
  
  const placeholderImage = new Image();
  placeholderImage.src = canvas.toDataURL();
  placeholderImage.onload = () => {
    imageNode.image(placeholderImage);
    this.stage.batchDraw();
  };
}




/**
 * Fallback: exportar como JPEG
 */
private exportarComoJPEG(): void {
  try {
    this.stage.batchDraw();
    
    setTimeout(() => {
      const dataURL = this.stage.toDataURL({
        pixelRatio: 1,
        quality: 0.8,
        mimeType: 'image/jpeg'
      });

      const link = document.createElement('a');
      link.download = `linea-tiempo-${new Date().getTime()}.jpg`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ Exportación JPEG exitosa');
      alert('✅ Imagen exportada como JPEG');
      
    }, 50);
    
  } catch (error) {
    console.error('❌ Error en exportación JPEG:', error);
    alert('❌ Error crítico: No se pudo exportar la imagen.');
  }
}
 //##############################################

   onResize(): void {
    if (this.stage) {
      this.renderTimelineBase();
      if (this.isPresentacionMode) {
        // En modo presentación, usar toda la pantalla
        this.stage.width(window.innerWidth);
        this.stage.height(window.innerHeight);
      } else {
        // Modo normal
        const container = this.container.nativeElement;
        const scale = this.containerSize / 100;
        
        this.stage.width(container.offsetWidth / scale);
        this.stage.height(container.offsetHeight / scale);
      }
      
      this.updateBackgroundColor(this.backgroundColor);
      this.renderTimelineEvents();
      
      // Actualizar anchos de los textos
      if (this.proyectoTitleElement) {
        this.proyectoTitleElement.width(this.stage.width() - 100);
      }
      if (this.proyectoDescriptionElement) {
        this.proyectoDescriptionElement.width(this.stage.width() - 100);
      }
      
      this.mainLayer.batchDraw();
    }
  }


/**
 * Serializa todos los elementos Konva del layer principal
 */
 serializarElementosKonva(): any[] {
  const elementosSerializados: any[] = [];
  
  if (!this.mainLayer || !this.mainLayer.children) {
    return elementosSerializados;
  }

  this.mainLayer.children.forEach((node: Konva.Node) => {
    // No serializar la línea de tiempo base ni los transformers
    if (this.esElementoSerializable(node)) {
      const elementoSerializado = this.serializarNodoKonva(node);
      if (elementoSerializado) {
        elementosSerializados.push(elementoSerializado);
      }
    }
  });

  return elementosSerializados;
}

/**
 * Determina si un nodo Konva debe ser serializado
 */
private esElementoSerializable(node: Konva.Node): boolean {
  const className = node.getClassName();
  const esTransformer = className === 'Transformer';
  const esLineaTiempo = node instanceof Konva.Line && 
                       node.points().length === 4 && 
                       node.stroke() === '#070707ff';
  
  return !esTransformer && !esLineaTiempo;
}

/**
 * Serializa un nodo Konva individual
 */
private serializarNodoKonva(node: Konva.Node): any {
  const baseProps = {
    tipo: node.getClassName(),
    x: node.x(),
    y: node.y(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
    rotation: node.rotation(),
    draggable: node.draggable()
  };

  // ✅ CORREGIDO: No llamar a serializarNodoKonva dentro de los métodos específicos
  switch (node.getClassName()) {
    case 'Group':
      return {
        ...baseProps,
        ...this.serializarGrupo(node as Konva.Group)
      };
    
    case 'Rect':
      return {
        ...baseProps,
        ...this.serializarRect(node as Konva.Rect)
      };
    
    case 'Circle':
      return {
        ...baseProps,
        ...this.serializarCircle(node as Konva.Circle)
      };
    
    case 'Text':
      return {
        ...baseProps,
        ...this.serializarText(node as Konva.Text)
      };
    
    case 'Image':
      return {
        ...baseProps,
        ...this.serializarImage(node as Konva.Image)
      };
    
    case 'Line':
      return {
        ...baseProps,
        ...this.serializarLine(node as Konva.Line)
      };
    
    case 'Star':
      return {
        ...baseProps,
        ...this.serializarStar(node as Konva.Star)
      };
    
    default:
      return baseProps;
  }
}

/**
 * Serializa un grupo Konva
 */
private serializarGrupo(group: Konva.Group): any {
  const hijosSerializados: any[] = [];
  
  group.children?.forEach((child: Konva.Node) => {
    // ✅ SOLO serializar propiedades básicas para hijos, no recursión completa
    hijosSerializados.push(this.serializarPropiedadesBasicas(child));
  });

  return {
    hijos: hijosSerializados,
    clip: this.obtenerClipGrupo(group)
  };
}

private serializarPropiedadesBasicas(node: Konva.Node): any {
  return {
    tipo: node.getClassName(),
    x: node.x(),
    y: node.y(),
    // Solo propiedades esenciales para identificar el nodo
  };
}

private serializarLine(line: Konva.Line): any {
  return {
    points: line.points(),
    stroke: line.stroke(),
    strokeWidth: line.strokeWidth(),
    dash: line.dash()
  };
}

/**
 * Serializa un rectángulo Konva
 */
private serializarRect(rect: Konva.Rect): any {
  return {
    width: rect.width(),
    height: rect.height(),
    fill: rect.fill(),
    stroke: rect.stroke(),
    strokeWidth: rect.strokeWidth(),
    cornerRadius: rect.cornerRadius(),
    shadow: this.obtenerShadow(rect)
  };
}

/**
 * Serializa un círculo Konva
 */
private serializarCircle(circle: Konva.Circle): any {
  return {
    radius: circle.radius(),
    fill: circle.fill(),
    stroke: circle.stroke(),
    strokeWidth: circle.strokeWidth(),
    shadow: this.obtenerShadow(circle)
  };
}

/**
 * Serializa texto Konva
 */
private serializarText(text: Konva.Text): any {
  return {
    text: text.text(),
    fontSize: text.fontSize(),
    fontFamily: text.fontFamily(),
    fill: text.fill(),
    fontStyle: text.fontStyle(),
    align: text.align(),
    width: text.width(),
    height: text.height(),
    shadow: this.obtenerShadow(text)
  };
}

/**
 * Serializa imagen Konva
 */
private serializarImage(image: Konva.Image): any {
  // ✅ MODIFICACIÓN: Guardar ambos - URL para BD y data URL para exportación
  const imageUrl = image.getAttr('imageSrc') || '';
  
  // Solo crear data URL si es necesario (imágenes locales/temporales)
  let imageData = '';
  if (!imageUrl || imageUrl.startsWith('data:')) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = image.width();
        canvas.height = image.height();
        image.toCanvas(ctx);
        imageData = canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.warn('No se pudo serializar la imagen:', error);
    }
  }
  
  return {
    width: image.width(),
    height: image.height(),
    imageUrl: imageUrl, // ← Para la base de datos
    imageData: imageData, // ← Para exportación/backup
    cornerRadius: image.cornerRadius(),
    shadow: this.obtenerShadow(image)
  };
}

/**
 * Serializa línea Konva
 */


/**
 * Serializa estrella Konva
 */
private serializarStar(star: Konva.Star): any {
  return {
    numPoints: star.numPoints(),
    innerRadius: star.innerRadius(),
    outerRadius: star.outerRadius(),
    fill: star.fill(),
    stroke: star.stroke(),
    strokeWidth: star.strokeWidth()
  };
}

/**
 * Obtiene información del clipping de un grupo
 */
private obtenerClipGrupo(group: Konva.Group): any {
  const clipType = group.getAttr('clipType');
  if (!clipType) return null;

  return {
    type: clipType,
    radius: group.getAttr('clipRadius'),
    x: group.getAttr('clipX'),
    y: group.getAttr('clipY'),
    width: group.getAttr('clipWidth'),
    height: group.getAttr('clipHeight')
  };
}

/**
 * Obtiene información de sombra de un nodo
 */
private obtenerShadow(node: Konva.Shape): any {
  return {
    color: node.shadowColor(),
    blur: node.shadowBlur(),
    offset: node.shadowOffset(),
    opacity: node.shadowOpacity()
  };
}

/**
 * Muestra un mensaje al usuario
 */
private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
  // Puedes implementar un sistema de notificaciones más elegante
  alert(`${tipo === 'success' ? '✅' : '❌'} ${mensaje}`);
}


/**
 * Limpia el editor completamente
 */
private limpiarEditorCompletamente(): void {
  this.mainLayer.destroyChildren();
  this.backgroundLayer.destroyChildren();
  this.renderTimelineBase();
  this.updateBackgroundColor(this.backgroundColor);
}

}