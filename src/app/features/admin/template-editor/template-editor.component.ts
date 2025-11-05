
import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Konva from 'konva';
import { AdminTemplateService } from './admin-template.service';

import { 
  AdminTemplate, 
  ZonaEvento, 
  LineaDeTiempoConfig,
  ElementoDecorativo,
  SerializedKonvaElement,
  ElementoLayout,
  ElementoEvento,
  FormaImagen,
  Categoria
} from './admin-template.interface';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ArchivoService } from '../../../core/services/archivo.service';
import { ActivatedRoute } from '@angular/router';

type ToolType = 'select'| 'multi-select' | 'line' | 'rect' | 'circle' | 'text' | 'event-zone' | 'connector';

@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-editor.component.html',
  styleUrls: ['./template-editor.component.css']
})
export class TemplateEditorComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef;

  // Konva Stage y Layers
  stage!: Konva.Stage;
  backgroundLayer!: Konva.Layer;
  timelineLayer!: Konva.Layer;
  eventsLayer!: Konva.Layer;
  decorLayer!: Konva.Layer;
    selectionLayer!: Konva.Layer;
  
  // Herramienta actual
  currentTool: ToolType = 'select';


  clipboard: any[] = [];

showSaveModal: boolean = false;

// Métodos para manejar el modal
openSaveModal() {
  this.showSaveModal = true;
}

closeSaveModal() {
  this.showSaveModal = false;
}




zoomLevel: number = 0.8;

zoomIn() {
  if (this.zoomLevel < 2) {
    this.zoomLevel += 0.1;
  }
}

zoomOut() {
  if (this.zoomLevel > 0.3) {
    this.zoomLevel -= 0.1;
  }
}

resetZoom() {
  this.zoomLevel = 0.8;
}

   selectionRect: Konva.Rect | null = null;
  isSelectingMultiple: boolean = false;
  selectionStartPoint: { x: number; y: number } = { x: 0, y: 0 };
  
  // Configuración de la plantilla
  templateName: string = '';
  templateDescription: string = '';
  templateCategory: string = 'educativa'; 
  isPublic: boolean = true;
  isSaving: boolean = false;
  backgroundColor: string = '#ffffff';

  currentTemplateId?: number;

  selectedElement: ElementoEvento | null = null;


  // NUEVAS PROPIEDADES PARA PORTADA
  proyectoPortada: string = '';
  portadaArchivo: File | null = null;
  showPortadaModal: boolean = false;


  // Lista de categorías para el select
  categorias: Categoria[] = [];
  selectedCategoria: Categoria = {} as Categoria;
  
  // Canvas settings
  canvasWidth: number = 1200;
  canvasHeight: number = 800;
  
  // Zonas de eventos definidas
  eventZones: ZonaEvento[] = [];
  selectedZone: ZonaEvento | null = null;
  zoneCounter: number = 1;
  
  // Línea de tiempo
  timelineConfig: LineaDeTiempoConfig = {
    tipo: 'custom',
    elementosKonva: [],
    
    estilo: {
      stroke: '#070707ff',
      strokeWidth: 5,
      lineCap: 'round'
    },

  positionX: 600,
  positionY: 400,
  intensity: 20,
  intensitycurva: 100,
  anchoTotal: 1110,
  turns: 3,
  length: 1000
  };


  changeTimelineType(type: 'horizontal' | 'vertical' | 'curve' | 'wave' | 'zigzag' | 'spiral' | 'custom' |'s-curve'): void {
  this.timelineConfig.tipo = type;
  this.redrawTimeline();
  }



redrawTimeline(): void {
  // Limpiar línea de tiempo actual
  this.timelineLayer.destroyChildren();
  
  switch (this.timelineConfig.tipo) {
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
    case 's-curve':
      this.drawSCurveTimeline();
      break;
    case 'custom':
      // Modo dibujo libre - no hacer nada, el usuario dibujará manualmente
      break;
    default:
      this.drawHorizontalTimeline();
  }
  
  this.timelineLayer.batchDraw();
}



private drawSCurveTimeline(): void {
  const centerX = this.timelineConfig.positionX + 100;
  const centerY = this.timelineConfig.positionY;
  const curveHeight = this.timelineConfig.intensitycurva * 2;
  const cornerRadius = 20;
  
  // 🔹 Usar el ancho total desde la configuración
  const totalWidth = this.timelineConfig.anchoTotal; 
  const halfWidth = totalWidth / 2;

  // Calcular startX y endX basados en centerX
  const startX = centerX - halfWidth;
  const endX = centerX + halfWidth;

  const sCurve = new Konva.Shape({
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

      // 🔹 Ajustar final en función del ancho total
      context.lineTo(endX * 0.77, centerY + curveHeight);
      
      context.strokeShape(shape);
    },
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    lineJoin: 'round',
    draggable: true,
  });

  this.timelineLayer.add(sCurve);
  this.makeElementInteractive(sCurve);
}


/**
 * Dibujar línea horizontal
 */
private drawHorizontalTimeline(): void {
  const y = this.timelineConfig.positionY;
  const line = new Konva.Line({
    points: [50, y, this.canvasWidth - 50, y],
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(line);
  this.makeElementInteractive(line);
  
  // Agregar marcadores cada 100px
 /* for (let x = 100; x < this.canvasWidth - 50; x += 100) {
    this.addTimelineMarker(x, y, 'horizontal');
  }*/
}

/**
 * Dibujar línea vertical
 */
private drawVerticalTimeline(): void {
  const x = this.timelineConfig.positionX;
  const line = new Konva.Line({
    points: [x, 50, x, this.canvasHeight - 50],
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(line);
  this.makeElementInteractive(line);
  
  // Agregar marcadores cada 100px
 /* for (let y = 100; y < this.canvasHeight - 50; y += 100) {
    this.addTimelineMarker(x, y, 'vertical');
  }*/
}

/**
 * Dibujar línea curva
 */
private drawCurvedTimeline(): void {
  const startY = this.timelineConfig.positionY;
  const controlY = startY - 100;
  
  const points = [];
  for (let x = 50; x <= this.canvasWidth - 50; x += 10) {
    const t = (x - 50) / (this.canvasWidth - 100);
    const y = this.quadraticBezier(startY, controlY, startY, t);
    points.push(x, y);
  }
  
  const curve = new Konva.Line({
    points: points,
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(curve);
  this.makeElementInteractive(curve);
}

/**
 * Dibujar línea ondulada
 */
private drawWaveTimeline(): void {
  const baseY = this.timelineConfig.positionY;
  const amplitude = this.timelineConfig.intensity;
  const frequency = 0.02;
  
  const points = [];
  for (let x = 50; x <= this.canvasWidth - 50; x += 5) {
    const y = baseY + Math.sin(x * frequency) * amplitude;
    points.push(x, y);
  }
  
  const wave = new Konva.Line({
    points: points,
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(wave);
  this.makeElementInteractive(wave);
}

/**
 * Dibujar línea zigzag
 */
private drawZigzagTimeline(): void {
  const baseY = this.timelineConfig.positionY;
  const amplitude = this.timelineConfig.intensity;
  const segmentLength = 50;
  
  const points = [50, baseY];
  let x = 50;
  let up = true;
  
  while (x < this.canvasWidth - 50) {
    x += segmentLength;
    const y = up ? baseY - amplitude : baseY + amplitude;
    points.push(x, y);
    up = !up;
  }
  
  const zigzag = new Konva.Line({
    points: points,
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(zigzag);
  this.makeElementInteractive(zigzag);
}

/**
 * Dibujar línea espiral
 */
private drawSpiralTimeline(): void {
  const centerX = this.timelineConfig.positionX;
  const centerY = this.timelineConfig.positionY;
  const turns = this.timelineConfig.turns;
  const maxRadius = 200;
  
  const points = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * turns;
    const radius = t * maxRadius;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    points.push(x, y);
  }
  
  const spiral = new Konva.Line({
    points: points,
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth,
    lineCap: this.timelineConfig.estilo.lineCap,
    draggable: true
  });
  
  this.timelineLayer.add(spiral);
  this.makeElementInteractive(spiral);
}


private addTimelineMarker(x: number, y: number, orientation: 'horizontal' | 'vertical'): void {
  let points: number[];
  
  if (orientation === 'horizontal') {
    points = [x, y - 10, x, y + 10];
  } else {
    points = [x - 10, y, x + 10, y];
  }
  
  const marker = new Konva.Line({
    points: points,
    stroke: this.timelineConfig.estilo.stroke,
    strokeWidth: this.timelineConfig.estilo.strokeWidth / 2,
    lineCap: this.timelineConfig.estilo.lineCap
  });
  
  this.timelineLayer.add(marker);
}

/**
 * Función de ayuda para curvas Bézier
 */
private quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

  
  // Elementos decorativos
  decorativeElements: ElementoDecorativo[] = [];
  
  // Control de dibujo
  isDrawing: boolean = false;
  drawingElement: Konva.Shape | null = null;
  startPoint: { x: number; y: number } = { x: 0, y: 0 };
  
  // Transformer para selección
  transformer!: Konva.Transformer;
  
  // Modo de vista previa
  previewMode: boolean = false;
  
  // Estado de guardado
 

  constructor(private templateService: AdminTemplateService,
              private authService: AuthService,
              private archivoService: ArchivoService,
            private route: ActivatedRoute) {}


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

  ngOnInit(): void {
    this.loadCategorias();
    this.initKonva();
    this.setupDrawingEvents();
    this.setupKeyboardShortcuts();

    this.changeTimelineType('horizontal');



    this.route.queryParams.subscribe(params => {
      const proyectoId = params['proyecto'];
      
      if (proyectoId) {
        console.log('📂 Cargando plantilla desde URL:', proyectoId);
        this.loadTemplate(Number(proyectoId));
      } else {
        console.log('📝 Iniciando editor sin plantilla');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  /**
   * Atajos de teclado
   */
  @HostListener('window:keydown', ['$event'])
handleKeyboardEvent(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement || 
      event.target instanceof HTMLTextAreaElement) {
    return;
  }

  // Ctrl+C o Cmd+C para copiar
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    this.copySelectedElements();
    return;
  }

  // Ctrl+V o Cmd+V para pegar
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    this.pasteElements();
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'v':
      if (!event.ctrlKey && !event.metaKey) {
        this.selectTool('select');
      }
      break;
    case 'l':
      this.selectTool('line');
      break;
    case 'r':
      this.selectTool('rect');
      break;
    case 'c':
      if (!event.ctrlKey && !event.metaKey) {
        this.selectTool('circle');
      }
      break;
    case 'm':
      this.selectTool('multi-select');
      break;
    case 't':
      this.selectTool('text');
      break;
    case 'e':
      this.selectTool('event-zone');
      break;
    case 'delete':
    case 'backspace':
      event.preventDefault();
      this.deleteSelected();
      break;
    case 'escape':
      this.selectTool('select');
      break;
  }
}


 loadCategorias(): void {
    this.templateService.getCategorias().subscribe({
      next: (categorias) => {
        this.categorias = categorias;
        // Seleccionar la categoría por defecto
        this.selectedCategoria = categorias.find(c => c.nombre.toLowerCase() === 'educativa') || categorias[0];
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        // Fallback a categorías por defecto
        
      }
    });
  }

private copySelectedElements(): void {
  const nodes = this.transformer.nodes();
  
  if (nodes.length === 0) {
    console.log('⚠️ No hay elementos seleccionados para copiar');
    return;
  }

  this.clipboard = nodes.map(node => {
    const elementId = node.getAttr('elementId');
    const zoneId = node.getAttr('zoneId');
    const elementType = node.getAttr('elementType');

    // Si es un elemento de zona, obtener todos los datos del modelo
    if (elementId && zoneId && elementType) {
      const zone = this.eventZones.find(z => z.id === zoneId);
      const elemento = zone?.elementos.find(e => e.id === elementId);
      
      if (elemento) {
        return {
          type: node.getClassName(),
          elementId: elementId,
          zoneId: zoneId,
          elementType: elementType,
          isGroup: node instanceof Konva.Group,
          // Guardar TODO el objeto elemento con su configuración completa
          elementoData: JSON.parse(JSON.stringify(elemento))
        };
      }
    }

    // Para elementos decorativos
    return {
      type: node.getClassName(),
      attrs: node.getAttrs(),
      data: this.serializeKonvaElement(node as Konva.Shape),
      elementId: node.getAttr('elementId'),
      zoneId: node.getAttr('zoneId'),
      elementType: node.getAttr('elementType'),
      isGroup: node instanceof Konva.Group
    };
  });

  console.log(`✅ ${this.clipboard.length} elemento(s) copiado(s)`);
}


// Nuevo método para pegar elementos:

private pasteElements(): void {
  if (this.clipboard.length === 0) {
    console.log('⚠️ Portapapeles vacío');
    return;
  }

  const newNodes: (Konva.Shape | Konva.Group)[] = [];
  const offset = 20;
  
  // Separar elementos por tipo
  const elementosDeZona = this.clipboard.filter(item => 
    this.esElementoDeZona(item)
  );
  
  const elementosDecorativos = this.clipboard.filter(item => 
    !this.esElementoDeZona(item)
  );

  // SOLO procesar elementos decorativos (contenedor, forma)
  elementosDecorativos.forEach((clipboardItem) => {
    try {
      const newNode = this.reconstructKonvaElement(clipboardItem.data);
      
      if (newNode) {
        newNode.x((newNode.x() || 0) + offset);
        newNode.y((newNode.y() || 0) + offset);
        
        this.decorLayer.add(newNode as any);
        this.makeElementInteractive(newNode as Konva.Shape);
        this.addDecorativeElement(newNode as Konva.Shape);
        newNodes.push(newNode);
      }
    } catch (error) {
      console.error('❌ Error pegando elemento decorativo:', error);
    }
  });

  // SOLO procesar elementos de zona si hay
  if (elementosDeZona.length > 0) {
    this.pasteIntoNextEvent(elementosDeZona);
  }

  // Solo actualizar transformer si hay elementos decorativos
  if (newNodes.length > 0) {
    this.transformer.nodes(newNodes);
    this.transformer.visible(true);
    this.configureTransformerForMultipleSelection();
    this.decorLayer.batchDraw();
  }

  this.eventsLayer.batchDraw();
  const totalCount = elementosDecorativos.length + elementosDeZona.length;
  console.log(`✅ ${totalCount} elemento(s) pegado(s)`);
}






private pasteIntoNextEvent(elementosDeZona: any[]): void {
  // Obtener la zona original
  const zonaOriginal = this.eventZones.find(z => z.id === elementosDeZona[0].zoneId);
  
  // Buscar el siguiente evento en la lista
  let targetZone: ZonaEvento | null = null;
  
  if (zonaOriginal) {
    const currentIndex = this.eventZones.indexOf(zonaOriginal);
    
    if (currentIndex < this.eventZones.length - 1) {
      targetZone = this.eventZones[currentIndex + 1];
    }
  }

  // Si no hay siguiente evento, crear uno nuevo
  if (!targetZone) {
    targetZone = {
      id: `zone-${this.zoneCounter++}`,
      nombre: `Evento ${this.eventZones.length + 1}`,
      posicion: {
        x: 50 + (this.eventZones.length * 30),
        y: 50 + (this.eventZones.length * 30),
        anchoMaximo: zonaOriginal?.posicion.anchoMaximo || 300,
        altoMaximo: zonaOriginal?.posicion.altoMaximo || 200
      },
      elementos: [],
      contenedor: {
        visible: false,
      },
      orden: this.eventZones.length + 1
    };

    this.eventZones.push(targetZone);

    const rect = new Konva.Rect({
      x: targetZone.posicion.x,
      y: targetZone.posicion.y,
      width: targetZone.posicion.anchoMaximo,
      height: targetZone.posicion.altoMaximo,
      fill: 'rgba(52, 152, 219, 0.3)',
      stroke: '#3498db',
      strokeWidth: 2,
      dash: [5, 5],
      draggable: true
    });

    rect.setAttr('zoneId', targetZone.id);
    this.eventsLayer.add(rect);
    this.addZoneLabel(rect, targetZone.nombre);
  }

  // Limpiar elementos existentes en la zona objetivo ANTES de pegar
  targetZone.elementos = [];
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    const childZoneId = child.getAttr('zoneId');
    if (childZoneId === targetZone!.id && child.getAttr('elementId')) {
      child.destroy();
    }
  });

  // Separar contenedores de otros elementos
  const contenedores = elementosDeZona.filter(item => item.elementType === 'contenedor');
  const otrosElementos = elementosDeZona.filter(item => item.elementType !== 'contenedor');

  // Primero pegar los contenedores
  contenedores.forEach((clipboardItem, index) => {
    try {
      const newElement: ElementoEvento = {
        id: `elem-${Date.now()}-${index}`,
        tipo: clipboardItem.elementoData.tipo,
        visible: clipboardItem.elementoData.visible,
        x: clipboardItem.elementoData.x,
        y: clipboardItem.elementoData.y,
        width: clipboardItem.elementoData.width,
        height: clipboardItem.elementoData.height,
        configuracion: JSON.parse(JSON.stringify(clipboardItem.elementoData.configuracion)),
        restricciones: clipboardItem.elementoData.restricciones ? 
          JSON.parse(JSON.stringify(clipboardItem.elementoData.restricciones)) :
          { movable: true, resizable: true, rotatable: true }
      };

      targetZone!.elementos.push(newElement);
      this.renderizarElemento(targetZone!, newElement);

    } catch (error) {
      console.error('❌ Error pegando contenedor:', error);
    }
  });

  // Luego pegar los otros elementos PRESERVANDO sus posiciones relativas
  otrosElementos.forEach((clipboardItem, index) => {
    try {
      const newElement: ElementoEvento = {
        id: `elem-${Date.now()}-contenedor-${index}`,
        tipo: clipboardItem.elementoData.tipo,
        visible: clipboardItem.elementoData.visible,
        // IMPORTANTE: Mantener las posiciones exactas relativas a la zona
        x: clipboardItem.elementoData.x,
        y: clipboardItem.elementoData.y,
        width: clipboardItem.elementoData.width,
        height: clipboardItem.elementoData.height,
        configuracion: JSON.parse(JSON.stringify(clipboardItem.elementoData.configuracion)),
        restricciones: clipboardItem.elementoData.restricciones ? 
          JSON.parse(JSON.stringify(clipboardItem.elementoData.restricciones)) :
          { movable: true, resizable: true, rotatable: true }
      };

      targetZone!.elementos.push(newElement);
      this.renderizarElemento(targetZone!, newElement);

    } catch (error) {
      console.error('❌ Error pegando elemento:', error);
    }
  });

  this.selectedZone = targetZone;
  this.eventsLayer.batchDraw();
  console.log(`✅ ${elementosDeZona.length} elemento(s) pegado(s) en "${targetZone.nombre}"`);
}


private esElementoDeZona(clipboardItem: any): boolean {
  const tiposDeZona = ['titulo', 'fecha', 'descripcion', 'link', 'personaje', 'imagen'];
  return tiposDeZona.includes(clipboardItem.elementType);
}



duplicateEventZone(zone: ZonaEvento): void {
  // Crear una copia profunda de la zona y todos sus elementos

  const nextEventNumber = this.eventZones.length + 1;
  const duplicatedZone: ZonaEvento = {
    ...JSON.parse(JSON.stringify(zone)), // Copia profunda
    id: `zone-${this.zoneCounter++}`,
    nombre: `Evento ${nextEventNumber}`,
    posicion: {
      ...zone.posicion,
      x: zone.posicion.x + 300, // Desplazar ligeramente
      y: zone.posicion.y 
    },
    orden: this.eventZones.length + 1
  };

  // Actualizar IDs de todos los elementos para evitar conflictos
  duplicatedZone.elementos.forEach(elemento => {
    elemento.id = `elem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });

  // Agregar la zona duplicada a la lista
  this.eventZones.push(duplicatedZone);

  // Renderizar la zona duplicada visualmente
  this.renderDuplicatedZone(duplicatedZone);

  // Seleccionar la nueva zona
  this.selectedZone = duplicatedZone;

  console.log(`✅ Evento "${zone.nombre}" duplicado correctamente`);
}

private renderDuplicatedZone(zone: ZonaEvento): void {
  // Crear el rectángulo de la zona
  const rect = new Konva.Rect({
    x: zone.posicion.x,
    y: zone.posicion.y,
    width: zone.posicion.anchoMaximo,
    height: zone.posicion.altoMaximo,
    fill: 'rgba(52, 152, 219, 0)',
    stroke: '#3498db',
    strokeWidth: 2,
    dash: [5, 5],
    draggable: true
  });

  rect.setAttr('zoneId', zone.id);
  
  // Hacer interactivo
  rect.on('dragmove', () => {
    const roundedX = Math.round(rect.x());
    const roundedY = Math.round(rect.y());
    
    rect.x(roundedX);
    rect.y(roundedY);
    
    zone.posicion.x = roundedX;
    zone.posicion.y = roundedY;
    
    // Actualizar posición de todos los elementos
    this.updateZoneElementsPosition(zone);
  });

  rect.on('click', (e) => {
    e.cancelBubble = true;
    this.selectedZone = zone;
    this.transformer.nodes([rect]);
    this.transformer.visible(true);
    this.decorLayer.batchDraw();
  });

  this.eventsLayer.add(rect);
  this.addZoneLabel(rect, zone.nombre);

  // Renderizar todos los elementos de la zona
  zone.elementos.forEach(elemento => {
    this.renderizarElemento(zone, elemento);
  });

  this.eventsLayer.batchDraw();
}

private updateZoneElementsPosition(zone: ZonaEvento): void {
  // Encontrar todos los grupos de elementos de esta zona
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    if (child instanceof Konva.Group && child.getAttr('zoneId') === zone.id) {
      const elementId = child.getAttr('elementId');
      const elemento = zone.elementos.find(e => e.id === elementId);
      
      if (elemento) {
        // Actualizar posición visual manteniendo la posición relativa
        child.x(zone.posicion.x + elemento.x);
        child.y(zone.posicion.y + elemento.y);
      }
    }
  });
  
  // Actualizar etiqueta de la zona
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    if (child instanceof Konva.Text && child.getAttr('isLabel') && child.getAttr('zoneId') === zone.id) {
      child.x(zone.posicion.x + 5);
      child.y(zone.posicion.y + 5);
    }
  });
  
  this.eventsLayer.batchDraw();
}



  /**
   * Configurar atajos de teclado
   */
  private setupKeyboardShortcuts(): void {
    console.log('✅ Atajos de teclado configurados');
  }

  /**
   * Inicializar Konva Stage
   */
 private initKonva(): void {
  this.stage = new Konva.Stage({
    container: 'konva-container',
    width: this.canvasWidth,
    height: this.canvasHeight
  });

  // Layer para fondo
  this.backgroundLayer = new Konva.Layer();
  this.updateBackground();
  this.stage.add(this.backgroundLayer);

  // Layer para línea de tiempo
  this.timelineLayer = new Konva.Layer();
  this.stage.add(this.timelineLayer);

  // Layer para zonas de eventos
  this.eventsLayer = new Konva.Layer();
  this.stage.add(this.eventsLayer);

  // Layer para elementos decorativos
  this.decorLayer = new Konva.Layer();
  this.stage.add(this.decorLayer);

  // SOLO UNA VEZ: Layer para selección múltiple (debe estar encima de todo)
  this.selectionLayer = new Konva.Layer();
  this.stage.add(this.selectionLayer);

  // Transformer para selección - CONFIGURADO PARA MÚLTIPLES NODOS
  this.transformer = new Konva.Transformer({
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    rotateEnabled: true,
    borderStroke: '#4A90E2',
    anchorFill: '#4A90E2',
    anchorStroke: '#fff',
    anchorSize: 8,
    keepRatio: false, // Permitir redimensionar libremente
    boundBoxFunc: (oldBox, newBox) => {
      // Permitir redimensionar a cualquier tamaño
      return newBox;
    }
  });
  this.decorLayer.add(this.transformer);
  this.transformer.visible(false);
}
  /**
   * Actualizar color de fondo
   */
  updateBackground(): void {
    this.backgroundLayer.destroyChildren();
    
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
      fill: this.backgroundColor,
      listening: false
    });
    
    this.backgroundLayer.add(background);
    this.backgroundLayer.batchDraw();
  }

  /**
   * Configurar eventos de dibujo
   */
private setupDrawingEvents(): void {
  // Click en el stage para deseleccionar
  this.stage.on('click', (e) => {
    // Si no es Ctrl+Click, deseleccionar
    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      if (e.target === this.stage) {
        this.transformer.nodes([]);
        this.selectedZone = null;
        this.selectedElement = null;
        this.decorLayer.batchDraw();
      }
    }
  });

  // Eventos de dibujo
  this.stage.on('mousedown touchstart', (e) => {
    if (this.previewMode) return;
    
    const pos = this.stage.getPointerPosition();
    if (!pos) return;
    
    if (this.currentTool === 'multi-select') {
      this.startMultiSelect(pos);
    } else if (this.currentTool === 'select' && (e.evt.ctrlKey || e.evt.metaKey)) {
      // Ctrl+Click con herramienta select también activa multi-select
      const clickedNode = e.target;
      if (clickedNode && clickedNode !== this.stage) {
        this.handleCtrlClick(clickedNode, e.evt.ctrlKey || e.evt.metaKey);
      }
    } else if (this.currentTool !== 'select') {
      this.isDrawing = true;
      this.startPoint = pos;
      this.handleDrawStart(pos);
    }
  });

  this.stage.on('mousemove touchmove', (e) => {
    if (this.currentTool === 'multi-select' && this.isSelectingMultiple) {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;
      this.updateMultiSelect(pos);
    } else if (this.isDrawing) {
      const pos = this.stage.getPointerPosition();
      if (!pos) return;
      this.handleDrawMove(pos);
    }
  });

  this.stage.on('mouseup touchend', () => {
    if (this.currentTool === 'multi-select' && this.isSelectingMultiple) {
      this.finalizeMultiSelect();
    } else if (this.isDrawing) {
      this.isDrawing = false;
      this.handleDrawEnd();
    }
  });
}


private handleCtrlClick(clickedNode: Konva.Node, isCtrlKey: boolean): void {
  if (!isCtrlKey) return;

  // Obtener los nodos actualmente seleccionados
  const currentNodes = this.transformer.nodes();
  
  // Verificar si el nodo clickeado ya está seleccionado
  const isAlreadySelected = currentNodes.includes(clickedNode);
  
  if (isAlreadySelected) {
    // Si está seleccionado, deseleccionarlo (remover de la lista)
    const newNodes = currentNodes.filter(node => node !== clickedNode);
    this.transformer.nodes(newNodes);
  } else {
    // Si no está seleccionado, agregarlo a la selección
    const newNodes = [...currentNodes, clickedNode];
    this.transformer.nodes(newNodes);
  }
  
  // Configurar transformer según la cantidad de elementos
  this.configureTransformerForMultipleSelection();
  
  if (this.transformer.nodes().length > 0) {
    this.transformer.visible(true);
  } else {
    this.transformer.visible(false);
  }
  
  this.decorLayer.batchDraw();
}






  private startMultiSelect(pos: { x: number; y: number }): void {
  this.isSelectingMultiple = true;
  this.selectionStartPoint = pos;
  
  this.selectionRect = new Konva.Rect({
    x: pos.x,
    y: pos.y,
    width: 0,
    height: 0,
    fill: 'rgba(78, 144, 240, 0.2)',
    stroke: '#4A90E2',
    strokeWidth: 1,
    dash: [2, 2],
    listening: false // No debe interceptar eventos
  });
  
  this.selectionLayer.add(this.selectionRect);
  this.selectionLayer.batchDraw();
}
private isIntersecting(rect1: any, rect2: any): boolean {
  if (!rect1 || !rect2) return false;
  
  return !(
    rect2.x > rect1.x + rect1.width ||
    rect2.x + rect2.width < rect1.x ||
    rect2.y > rect1.y + rect1.height ||
    rect2.y + rect2.height < rect1.y
  );
}

private updateMultiSelect(pos: { x: number; y: number }): void {
  if (!this.selectionRect) return;
  
  const width = pos.x - this.selectionStartPoint.x;
  const height = pos.y - this.selectionStartPoint.y;
  
  this.selectionRect.width(Math.abs(width));
  this.selectionRect.height(Math.abs(height));
  
  if (width < 0) {
    this.selectionRect.x(pos.x);
  } else {
    this.selectionRect.x(this.selectionStartPoint.x);
  }
  
  if (height < 0) {
    this.selectionRect.y(pos.y);
  } else {
    this.selectionRect.y(this.selectionStartPoint.y);
  }
  
  this.selectionLayer.batchDraw();
}
private finalizeMultiSelect(): void {
  this.isSelectingMultiple = false;
  
  if (!this.selectionRect) return;
  
  const selectionBox = this.selectionRect.getClientRect();
  const selectedNodes: Konva.Node[] = [];
  
  console.log('🔍 Área de selección:', selectionBox);
  
  // Buscar elementos en el área de selección en todas las capas
  const layers = [this.decorLayer, this.timelineLayer, this.eventsLayer];
  
  layers.forEach(layer => {
    layer.children?.forEach((child: Konva.Node) => {
      // Saltar el transformer y el rectángulo de selección
      if (child === this.transformer || child === this.selectionRect) {
        return;
      }
      
      // Obtener el bounding box del elemento
      let childBox;
      try {
        childBox = child.getClientRect();
      } catch (error) {
        console.log('❌ Error obteniendo bounding box de:', child);
        return;
      }
      
      console.log('📦 Elemento:', child.constructor.name, childBox);
      
      // Verificar si el elemento está dentro del área de selección
      if (this.isElementInSelection(childBox, selectionBox)) {
        console.log('✅ Elemento seleccionado:', child);
        
        // Solo agregar elementos que sean draggables o grupos
        if (child.draggable() || child instanceof Konva.Group) {
          // Para grupos de eventos, verificar que no sean etiquetas
          if (child instanceof Konva.Group && child.getAttr('isLabel')) {
            return; // Saltar etiquetas
          }
          
          selectedNodes.push(child);
        }
      }
    });
  });
  
  console.log('🎯 Total elementos seleccionados:', selectedNodes.length);
  
  // Aplicar selección
  if (selectedNodes.length > 0) {
    this.transformer.nodes(selectedNodes);
    this.transformer.visible(true);
    
    // Configurar transformer para múltiples selecciones
    this.configureTransformerForMultipleSelection();
    
    this.decorLayer.batchDraw();
  } else {
    // Si no se seleccionó nada, limpiar transformer
    this.transformer.nodes([]);
    this.transformer.visible(false);
    this.decorLayer.batchDraw();
  }
  
  // Limpiar rectángulo de selección
  this.selectionRect.destroy();
  this.selectionRect = null;
  this.selectionLayer.batchDraw();
}


private isElementInSelection(elementBox: any, selectionBox: any): boolean {
  return (
    elementBox.x >= selectionBox.x &&
    elementBox.y >= selectionBox.y &&
    elementBox.x + elementBox.width <= selectionBox.x + selectionBox.width &&
    elementBox.y + elementBox.height <= selectionBox.y + selectionBox.height
  );
}


private configureTransformerForMultipleSelection(): void {
  if (this.transformer.nodes().length > 1) {
    // Para múltiples selecciones, permitir todas las transformaciones
    this.transformer.enabledAnchors([
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ]);
    this.transformer.rotateEnabled(true);
    this.transformer.resizeEnabled(true);
  } else {
    // Para selección única, usar configuración normal
    this.transformer.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  }
}




  /**
   * Iniciar dibujo según herramienta
   */
  private handleDrawStart(pos: { x: number; y: number }): void {
    switch (this.currentTool) {
      case 'line':
        this.startDrawLine(pos);
        break;
      case 'rect':
        this.startDrawRect(pos);
        break;
      case 'circle':
        this.startDrawCircle(pos);
        break;
      case 'event-zone':
        this.startDrawEventZone(pos);
        break;
      case 'text':
        this.addText(pos);
        break;
    }
  }

  /**
   * Continuar dibujo
   */
  private handleDrawMove(pos: { x: number; y: number }): void {
    if (!this.drawingElement) return;
    
    switch (this.currentTool) {
      case 'line':
        (this.drawingElement as Konva.Line).points([
          this.startPoint.x, this.startPoint.y,
          pos.x, pos.y
        ]);
        break;
      case 'rect':
      case 'event-zone':
        const width = pos.x - this.startPoint.x;
        const height = pos.y - this.startPoint.y;
        (this.drawingElement as Konva.Rect).width(Math.abs(width));
        (this.drawingElement as Konva.Rect).height(Math.abs(height));
        if (width < 0) this.drawingElement.x(pos.x);
        if (height < 0) this.drawingElement.y(pos.y);
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pos.x - this.startPoint.x, 2) + 
          Math.pow(pos.y - this.startPoint.y, 2)
        );
        (this.drawingElement as Konva.Circle).radius(radius);
        break;
    }
    
    this.drawingElement.getLayer()?.batchDraw();
  }

  /**
   * Finalizar dibujo
   */
  private handleDrawEnd(): void {
    if (this.drawingElement) {
      this.makeElementInteractive(this.drawingElement);
      
      if (this.currentTool === 'event-zone') {
        this.finalizeEventZone(this.drawingElement as Konva.Rect);
      } else {
        // Agregar a elementos decorativos
        this.addDecorativeElement(this.drawingElement);
      }
    }
    
    this.drawingElement = null;
  }

agregarElementoAZona(zone: ZonaEvento, tipo: ElementoEvento['tipo']): void {
  const nuevoElemento: ElementoEvento = {
    id: `elem-${Date.now()}`,
    tipo: tipo,
    visible: true,
    x: 30,
    y: 50,
    width: 100,
    height: tipo === 'imagen' ? 80 : 60,
    configuracion: this.getConfiguracionPorDefecto(tipo),
    restricciones: {
      movable: true,
      resizable: true,
      rotatable: true
    }
  };

  zone.elementos.push(nuevoElemento);
  this.renderizarElemento(zone, nuevoElemento);

  
}


/**
 * ✅ ABRIR MODAL DE PORTADA
 */
abrirModalPortada(): void {
  this.showPortadaModal = true;
}

/**
 * ✅ CERRAR MODAL DE PORTADA
 */
cerrarModalPortada(): void {
  this.showPortadaModal = false;
  this.portadaArchivo = null;
}

/**
 * ✅ CANCELAR PORTADA
 */
cancelarPortada(): void {
  this.showPortadaModal = false;
  this.portadaArchivo = null;
  this.proyectoPortada = '';
}

/**
 * ✅ MANEJAR SELECCIÓN DE PORTADA
 */
onPortadaSelected(event: any): void {
  const file = event.target.files[0];
  console.log('📁 Archivo seleccionado para portada:', file);
  
  if (!file) {
    console.log('⚠️ No se seleccionó archivo');
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

  // ✅ Guardar el archivo
  this.portadaArchivo = file;
  console.log('✅ portadaArchivo establecido:', this.portadaArchivo);

  // ✅ Crear preview
  const reader = new FileReader();
  reader.onload = (e: any) => {
    this.proyectoPortada = e.target.result;
    console.log('🖼️ Preview de portada creado');
  };
  reader.onerror = (error) => {
    console.error('❌ Error leyendo archivo para preview:', error);
  };
  reader.readAsDataURL(file);
}

/**
 * ✅ ELIMINAR PORTADA
 */
eliminarPortada(): void {
  this.proyectoPortada = '';
  this.portadaArchivo = null;
  console.log('🗑️ Portada eliminada');
}


/**
 * ✅ GENERAR PORTADA AUTOMÁTICA DESDE EL PROYECTO
 */
private async generarPortadaDesdeProyecto(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🖼️ Generando portada automática desde plantilla...');
      
      // Ocultar elementos temporales (controles de edición)
      this.ocultarElementosTemporales();
      this.stage.batchDraw();
      
      setTimeout(() => {
        try {
          // Convertir el stage a imagen
          const dataURL = this.stage.toDataURL({
            pixelRatio: 1,
            quality: 0.8,
            mimeType: 'image/jpeg'
          });
          
          console.log('✅ Portada automática generada correctamente');
          
          // Convertir data URL a File
          this.portadaArchivo = this.dataURLtoFile(dataURL, `portada-plantilla-${Date.now()}.jpg`);
          this.proyectoPortada = dataURL;
          
          // Restaurar elementos
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

/**
 * ✅ OCULTAR ELEMENTOS TEMPORALES (controles de edición)
 */
private ocultarElementosTemporales(): void {
  try {
    console.log('👁️ Ocultando elementos temporales...');
    
    // Ocultar transformers
    this.transformer.visible(false);
    
    // Ocultar rectángulos de zonas (si están en modo edición)
    this.eventsLayer.children?.forEach((child: Konva.Node) => {
      if (child instanceof Konva.Rect && child.dash() && child.dash().length > 0) {
        child.visible(false);
      }
      if (child instanceof Konva.Text && child.getAttr('isLabel')) {
        child.visible(false);
      }
    });
    
    console.log('✅ Elementos temporales ocultados');
  } catch (error) {
    console.error('❌ Error ocultando elementos temporales:', error);
  }
}

/**
 * ✅ MOSTRAR ELEMENTOS TEMPORALES
 */
private mostrarElementosTemporales(): void {
  try {
    console.log('👁️ Mostrando elementos temporales...');
    
    // Mostrar transformers
    this.transformer.visible(true);
    
    // Mostrar rectángulos de zonas
    this.eventsLayer.children?.forEach((child: Konva.Node) => {
      if (child instanceof Konva.Rect && child.dash() && child.dash().length > 0) {
        child.visible(true);
      }
      if (child instanceof Konva.Text && child.getAttr('isLabel')) {
        child.visible(true);
      }
    });
    
    console.log('✅ Elementos temporales mostrados');
  } catch (error) {
    console.error('❌ Error mostrando elementos temporales:', error);
  }
}

/**
 * ✅ CONVERTIR DATA URL A FILE
 */
private dataURLtoFile(dataurl: string, filename: string): File {
  try {
    if (!dataurl || !dataurl.startsWith('data:')) {
      throw new Error('Invalid data URL');
    }

    const arr = dataurl.split(',');
    if (arr.length < 2) {
      throw new Error('Invalid data URL format');
    }

    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
    
  } catch (error) {
    console.error('❌ Error convirtiendo data URL a File:', error);
    return new File([], filename, { type: 'image/png' });
  }
}

private getConfiguracionPorDefecto(tipo: ElementoEvento['tipo']): any {
  const configs = {
    imagen: {
      forma: 'rectangulo' as FormaImagen,
      borderRadius: 0,
      stroke: '#141515ff',
      strokeWidth: 2,
      objectFit: 'cover' as const
    },
    titulo: {
      texto: 'Título del evento',
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#2c3e50',
      textAlign: 'left' as const
    },
    fecha: {
      texto: '2024',
      fontSize: 15,
      fontFamily: 'Arial',
      color: '#000000ff',
      textAlign: 'left' as const
    },
    descripcion: {
      texto: 'Descripción del evento...',
      fontSize: 11,
      fontFamily: 'Arial',
      color: '#34495e',
      textAlign: 'left' as const
    },
    personaje: { // ← NUEVO: Configuración para personaje
      texto: 'Personaje importante',
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#555555ff',
      textAlign: 'left' as const,
      fontWeight: 'normal'
    },
    link: { // ← NUEVO: Configuración para enlace
      textoLink: '🔗 Ver más',
      url: 'https://ejemplo.com',
      abrirEnNuevaVentana: true,
      fontSize: 11,
      fontFamily: 'Arial',
      color: '#3498db',
      textAlign: 'left' as const,
      textDecoration: 'underline'
    },
    contenedor: {
      forma: 'rectangulo' as const,
      fill: '#ffffff',
      stroke: '#0b0b0bff',
      strokeWidth: 2,
      cornerRadius: 4
    },
    forma: {
      forma: 'rectangulo' as const,
      fill: '#3498db',
      stroke: '#2980b9',
      strokeWidth: 4,
      cornerRadius: 0,

      // Nuevas propiedades para líneas y flechas
      puntos: [0, 0, 30, 0], // Para líneas: [x1, y1, x2, y2]
  dash: [5, 5], // Para líneas punteadas: [5, 5]
  puntaFlecha: true, // Para flechas
  tamañoPunta: 10  // Tamaño de la punta de flecha
    }
  };

  return configs[tipo] || {};
}


elementoYaExiste(zone: ZonaEvento, tipo: ElementoEvento['tipo']): boolean {
  return zone.elementos.some(elem => elem.tipo === tipo);
}

debeDeshabilitarBoton(zone: ZonaEvento, tipo: ElementoEvento['tipo']): boolean {
  // El contenedor solo se puede agregar una vez
  if (tipo === 'imagen') {
    return this.elementoYaExiste(zone, 'imagen');
  }else if(tipo=='descripcion'){
    return this.elementoYaExiste(zone,'descripcion')
  }
  else if(tipo=='titulo'){
    return this.elementoYaExiste(zone,'titulo')
  }else if(tipo=='link'){
    return this.elementoYaExiste(zone,'link')
  }else if(tipo=='fecha'){
    return this.elementoYaExiste(zone,'fecha')
  }else if(tipo=='personaje'){
    return this.elementoYaExiste(zone,'personaje')
  }
  
  // Otros elementos se pueden agregar múltiples veces, o solo una vez
  // Ajusta según tus necesidades. Por defecto, permite múltiples:
  return false;
  
  // Si quieres que solo haya UNA instancia de cada tipo, descomenta:
  // return this.elementoYaExiste(zone, tipo);
}


private renderizarElemento(zone: ZonaEvento, elemento: ElementoEvento): void {
  // Limpiar elemento existente
  this.removerElementoVisual(elemento.id);

  // Asegurar valores enteros
  const x = Math.round(zone.posicion.x + elemento.x);
  const y = Math.round(zone.posicion.y + elemento.y);
  const width = Math.round(elemento.width);
  const height = Math.round(elemento.height);
  const rotation = Math.round(elemento.configuracion.rotation || 0);

  const group = new Konva.Group({
    x: x,
    y: y,
    width: width,
    height: height,
    draggable: elemento.restricciones?.movable ?? true,
    rotation: rotation
  });
  
  group.setAttr('elementId', elemento.id);
  group.setAttr('zoneId', zone.id);
  group.setAttr('elementType', elemento.tipo);

  // Crear forma según tipo
  let shape: Konva.Shape;

  switch (elemento.tipo) {
    case 'imagen':
      shape = this.crearFormaImagen(elemento);
      break;

    case 'titulo':
    case 'fecha':
    case 'descripcion':
    case 'personaje':
      shape = new Konva.Text({
        width: width,
        height: height,
        text: this.obtenerTextoElemento(elemento),
        fontSize: elemento.configuracion.fontSize || 12,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#000000',
        align: elemento.configuracion.textAlign || 'left',
        fontStyle: elemento.configuracion.fontWeight || 'normal'
      });
      break;

    case 'link':
      shape = this.crearElementoLink(elemento);
      break;

    case 'contenedor':
    case 'forma':
      shape = this.crearFormaGeometrica(elemento);
      break;
  }

  if (shape) {
    group.add(shape);
    
    // Hacer interactivo
    this.hacerElementoEventoInteractivo(group, zone, elemento);
    
    this.eventsLayer.add(group);
    this.eventsLayer.batchDraw();
  }
}

private crearElementoLink(elemento: ElementoEvento): Konva.Text {
  const texto = elemento.configuracion.textoLink || 'Enlace';
  const color = elemento.configuracion.color || '#3498db';
  
  return new Konva.Text({
    width: elemento.width,
    height: elemento.height,
    text: texto,
    fontSize: elemento.configuracion.fontSize || 11,
    fontFamily: elemento.configuracion.fontFamily || 'Arial',
    fill: color,
    align: elemento.configuracion.textAlign || 'left',
    textDecoration: 'underline', // ← Indicador visual de que es un enlace
    cursor: 'pointer' // ← Cambiar cursor al pasar por encima
  });
}

private obtenerTextoElemento(elemento: ElementoEvento): string {
  switch (elemento.tipo) {
    case 'titulo':
      return elemento.configuracion.texto || 'Título del evento';
    case 'fecha':
      return elemento.configuracion.texto || '2024';
    case 'descripcion':
      return elemento.configuracion.texto || 'Descripción del evento...';
    case 'personaje':
      return elemento.configuracion.texto || 'Personaje importante';
    case 'link':
      return elemento.configuracion.textoLink || '🔗 Ver más';
    default:
      return elemento.configuracion.texto || 'Texto';
  }
}


selectElementForEditing(zone: ZonaEvento, elemento: ElementoEvento): void {
  // Establecer elemento seleccionado
  this.selectedElement = elemento;
  this.selectedZone = zone;
  
  // Buscar el grupo visual del elemento
  const grupo = this.eventsLayer.findOne((node: Konva.Node) => {
    return node.getAttr('elementId') === elemento.id;
  });

  if (grupo && grupo instanceof Konva.Group) {
    // Seleccionar visualmente en el canvas
    this.transformer.nodes([grupo]);
    this.transformer.visible(true);
    
    // Configurar transformer según restricciones
    this.transformer.enabledAnchors(
      elemento.restricciones?.resizable ? 
      ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] : 
      []
    );
    this.transformer.rotateEnabled(elemento.restricciones?.rotatable ?? true);
    
    this.decorLayer.batchDraw();
  }
}


selectZone(zone: ZonaEvento): void {
  this.selectedZone = zone;
  this.selectedElement = null; // Limpiar elemento seleccionado
  
  // Deseleccionar elementos en el canvas
  this.transformer.nodes([]);
  this.transformer.visible(false);
  this.decorLayer.batchDraw();
}

/**
 * Crear forma para elemento de imagen
 */
private crearFormaImagen(elemento: ElementoEvento): Konva.Shape {
  const forma = elemento.configuracion.forma || 'rectangulo';
  const width = elemento.width;
  const height = elemento.height;
  const fill = '#bdc3c7';
  const stroke = elemento.configuracion.stroke;
  const strokeWidth = elemento.configuracion.strokeWidth;

  switch (forma) {
    case 'circulo':
      // ✅ IMPORTANTE: Usar offsetX/offsetY para centrar sin cambiar x,y
      return new Konva.Circle({
        x: width / 2,  // ← Centro dentro del área del elemento
        y: height / 2,
        radius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        offsetX: 0,  // ✅ SIN offset adicional
        offsetY: 0
      });

    case 'estrella':
      // ✅ Mismo principio: centrar dentro del área
      return new Konva.Star({
        x: width / 2,
        y: height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        offsetX: 0,  // ✅ SIN offset adicional
        offsetY: 0
      });

    case 'rombo':
      // ✅ Crear puntos RELATIVOS al área (0,0 a width,height)
      const points = [
        width / 2, 0,           // top (centro superior)
        width, height / 2,      // right (centro derecho)
        width / 2, height,      // bottom (centro inferior)
        0, height / 2          // left (centro izquierdo)
      ];
      return new Konva.Line({
        points: points,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });

    case 'rectangulo':
    default:
      // ✅ Rectángulo ya funciona correctamente (esquina superior izquierda)
      return new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion.borderRadius || 0
      });
  }
}

/**
 * Crear forma geométrica para contenedores y formas
 */
private crearFormaGeometrica(elemento: ElementoEvento): Konva.Shape {
  const forma = elemento.configuracion.forma || 'rectangulo';
  const width = Math.max(elemento.width, 20);
  const height = Math.max(elemento.height, 20);
  const fill = elemento.configuracion.fill || '#3498db';
  const stroke = elemento.configuracion.stroke || '#2980b9';
  const strokeWidth = elemento.configuracion.strokeWidth || 1;
  
  let shape: Konva.Shape;
  
  switch (forma) {
    case 'linea':
      shape = this.crearLinea(elemento);
      shape.setAttr('shapeType', 'linea');
      break;
    
    case 'linea-punteada':
      shape = this.crearLineaPunteada(elemento);
      shape.setAttr('shapeType', 'linea-punteada');
      break;
    
    case 'flecha':
      shape = this.crearFlechaComoLinea(elemento);
      shape.setAttr('shapeType', 'flecha');
      break;
    
    case 'circulo':
      // ✅ CORREGIDO: Centrar dentro del área sin modificar coordenadas
      return new Konva.Circle({
        x: width / 2,  // ← Centro relativo al área
        y: height / 2,
        radius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        offsetX: 0,  // ✅ SIN offset adicional
        offsetY: 0
      });

    case 'estrella':
      // ✅ CORREGIDO
      return new Konva.Star({
        x: width / 2,
        y: height / 2,
        numPoints: 5,
        innerRadius: Math.min(width, height) * 0.4,
        outerRadius: Math.min(width, height) / 2,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        offsetX: 0,  // ✅ SIN offset adicional
        offsetY: 0
      });

    case 'rombo':
      // ✅ CORREGIDO: Puntos relativos al área (0,0 a width,height)
      const points = [
        width / 2, 0,        // top
        width, height / 2,   // right
        width / 2, height,   // bottom
        0, height / 2       // left
      ];
      return new Konva.Line({
        points: points,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        closed: true
      });

    case 'rectangulo':
    default:
      // ✅ Ya funciona correctamente
      return new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: elemento.configuracion.cornerRadius || 0
      });
  }
  
  return shape;
}


private crearLinea(elemento: ElementoEvento): Konva.Line {
  const puntos = elemento.configuracion.puntos || [0, 0, elemento.width, 0];
  const stroke = elemento.configuracion.stroke || '#3498db';
  const strokeWidth = elemento.configuracion.strokeWidth || 4;

  return new Konva.Line({
    points: puntos,
    stroke: stroke,
    strokeWidth: strokeWidth,
    lineCap: 'round',
    lineJoin: 'round'
  });
}

/**
 * Crear línea punteada
 */
private crearLineaPunteada(elemento: ElementoEvento): Konva.Line {
  const puntos = elemento.configuracion.puntos || [0, 0, elemento.width, 0];
  const stroke = elemento.configuracion.stroke || '#3498db';
  const strokeWidth = elemento.configuracion.strokeWidth || 2;
  const dash = elemento.configuracion.dash || [5, 5];

  return new Konva.Line({
    points: puntos,
    stroke: stroke,
    strokeWidth: strokeWidth,
    dash: dash,
    lineCap: 'round',
    lineJoin: 'round'
  });
}

/**
 * Crear flecha
 */
private crearFlechaComoLinea(elemento: ElementoEvento): Konva.Line {
  const config = elemento.configuracion as any;
  const stroke = config.stroke || '#3498db';
  const strokeWidth = config.strokeWidth || 2;
  const tamañoPunta = config.tamañoPunta || 10;
  const tienePunta = config.puntaFlecha !== false;

  // Puntos para la flecha: [x1, y1, x2, y2, x3, y3, x4, y4, x5, y5]
  // Donde:
  // - (x1,y1) es el inicio de la línea
  // - (x2,y2) es el final de la línea (antes de la punta)
  // - (x3,y3), (x4,y4), (x5,y5) forman la punta de la flecha
  
  const x1 = 0;
  const y1 = elemento.height / 2;
  const x2 = elemento.width - (tienePunta ? tamañoPunta : 0);
  const y2 = elemento.height / 2;

  let points: number[];

  if (tienePunta) {
    points = [
      x1, y1, // Inicio de la línea
      x2, y2, // Fin de la línea (inicio de la punta)
      x2, y2, // Punto de la punta (repetido para conectar)
      elemento.width - tamañoPunta, elemento.height / 2 - tamañoPunta / 2, // Esquina superior punta
      elemento.width, elemento.height / 2, // Punta de la flecha
      elemento.width - tamañoPunta, elemento.height / 2 + tamañoPunta / 2, // Esquina inferior punta
      x2, y2 // Volver al final de la línea
    ];
  } else {
    points = [x1, y1, elemento.width, elemento.height / 2];
  }

  return new Konva.Line({
    points: points,
    stroke: stroke,
    strokeWidth: strokeWidth,
    lineCap: 'round',
    lineJoin: 'round',
    fill: tienePunta ? stroke : undefined, // Relleno solo para la punta
    closed: tienePunta // Cerrar la forma si tiene punta
  });
}

private hacerElementoEventoInteractivo(group: Konva.Group, zone: ZonaEvento, elemento: ElementoEvento): void {
  group.on('dragmove', () => {
    const roundedX = Math.round(group.x());
    const roundedY = Math.round(group.y());
    
    group.x(roundedX);
    group.y(roundedY);
    
    elemento.x = roundedX - zone.posicion.x;
    elemento.y = roundedY - zone.posicion.y;
  });

  group.on('click', (e) => {
    e.cancelBubble = true;
    this.seleccionarElementoEvento(group, elemento);
  });

  group.on('transform', () => {
    // Obtener las dimensiones transformadas
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    
    const newWidth = Math.max(Math.round(group.width() * scaleX), 20);
    const newHeight = Math.max(Math.round(group.height() * scaleY), 20);
    const newRotation = Math.round(group.rotation());
    
    // Aplicar sin escala (usar ancho/alto directo)
    group.width(newWidth);
    group.height(newHeight);
    group.scaleX(1);
    group.scaleY(1);
    group.rotation(newRotation);
    
    // Actualizar todas las formas dentro del grupo
    group.children?.forEach((child: Konva.Node) => {
      const shapeType = child.getAttr('shapeType');
      
      if (child instanceof Konva.Text) {
        // Para texto (título, fecha, descripción, personaje, link)
        child.width(newWidth);
        child.height(newHeight);
      } else if (child instanceof Konva.Rect) {
        child.width(newWidth);
        child.height(newHeight);
      } else if (child instanceof Konva.Circle) {
        child.radius(Math.min(newWidth, newHeight) / 2);
      } else if (child instanceof Konva.Star) {
        child.innerRadius(Math.min(newWidth, newHeight) * 0.4);
        child.outerRadius(Math.min(newWidth, newHeight) / 2);
      } else if (child instanceof Konva.Line) {
        // Manejar diferentes tipos de líneas
        if (shapeType === 'rombo') {
          // Solo actualizar rombos
          const points = [
            0, -newHeight / 2,
            newWidth / 2, 0,
            0, newHeight / 2,
            -newWidth / 2, 0
          ];
          child.points(points);
        } else if (shapeType === 'linea' || shapeType === 'linea-punteada') {
          // Actualizar líneas simples
          const puntosOriginales = elemento.configuracion.puntos || [0, 0, elemento.width, 0];
          const factorX = newWidth / elemento.width;
          const factorY = newHeight / elemento.height;
          
          const nuevosPuntos = [
            puntosOriginales[0] * factorX, // x1
            puntosOriginales[1] * factorY, // y1
            puntosOriginales[2] * factorX, // x2
            puntosOriginales[3] * factorY  // y2
          ];
          child.points(nuevosPuntos);
        } else if (shapeType === 'flecha') {
          // Actualizar flechas
          this.actualizarFlecha(child, elemento, newWidth, newHeight);
        }
      }
    });
    
    // Actualizar el modelo
    elemento.width = newWidth;
    elemento.height = newHeight;
    elemento.configuracion.rotation = newRotation;
  });
}


private actualizarFlecha(flecha: Konva.Line, elemento: ElementoEvento, newWidth: number, newHeight: number): void {
  const config = elemento.configuracion as any;
  const tamañoPunta = config.tamañoPunta || 10;
  const tienePunta = config.puntaFlecha !== false;

  const x1 = 0;
  const y1 = newHeight / 2;
  const x2 = newWidth - (tienePunta ? tamañoPunta : 0);
  const y2 = newHeight / 2;

  let points: number[];

  if (tienePunta) {
    points = [
      x1, y1, // Inicio de la línea
      x2, y2, // Fin de la línea (inicio de la punta)
      x2, y2, // Punto de la punta (repetido para conectar)
      newWidth - tamañoPunta, newHeight / 2 - tamañoPunta / 2, // Esquina superior punta
      newWidth, newHeight / 2, // Punta de la flecha
      newWidth - tamañoPunta, newHeight / 2 + tamañoPunta / 2, // Esquina inferior punta
      x2, y2 // Volver al final de la línea
    ];
  } else {
    points = [x1, y1, newWidth, newHeight / 2];
  }

  flecha.points(points);
}


private isRomboPoints(points: number[]): boolean {
  // Un rombo tiene 4 puntos: [0, -h/2, w/2, 0, 0, h/2, -w/2, 0]
  if (points.length !== 8) return false;
  
  const [x1, y1, x2, y2, x3, y3, x4, y4] = points;
  
  // Verificar el patrón característico del rombo
  return (
    x1 === 0 && y1 < 0 &&  // top
    x2 > 0 && y2 === 0 &&  // right
    x3 === 0 && y3 > 0 &&  // bottom
    x4 < 0 && y4 === 0     // left
  );
}
seleccionarElementoEvento(group: Konva.Group, elemento: ElementoEvento): void {
  const isCtrlKey = (window.event as any)?.ctrlKey || (window.event as any)?.metaKey;

  const zoneId = group.getAttr('zoneId');
  const zone = this.eventZones.find(z => z.id === zoneId);
  
  if (isCtrlKey) {
    // Agregar/remover de la selección múltiple
    this.handleCtrlClick(group, true);
  } else {
    // Selección simple
    this.transformer.nodes([group]);
    this.transformer.visible(true);

     this.selectedZone = zone || null;
    this.selectedElement = elemento;
    
    // Configurar transformer según restricciones
    this.transformer.enabledAnchors(
      elemento.restricciones?.resizable ? 
      ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] : 
      []
    );
    this.transformer.rotateEnabled(elemento.restricciones?.rotatable ?? true);
    
    this.decorLayer.batchDraw();
  }
}


private removerElementoVisual(elementId: string): void {
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    if (child.getAttr('elementId') === elementId) {
      child.destroy();
    }
  });
}

eliminarElementoDeZona(zone: ZonaEvento, elemento: ElementoEvento): void {
  const index = zone.elementos.indexOf(elemento);
  if (index > -1) {
    zone.elementos.splice(index, 1);
    this.removerElementoVisual(elemento.id);
    this.eventsLayer.batchDraw();
  }
}

actualizarElemento(zone: ZonaEvento, elemento: ElementoEvento): void {
  this.renderizarElemento(zone, elemento);
}


  /**
   * Dibujar línea
   */
  private startDrawLine(pos: { x: number; y: number }): void {
  const line = new Konva.Line({
    points: [pos.x, pos.y, pos.x, pos.y],
    stroke: this.timelineConfig.estilo.stroke, // Usar el color actual
    strokeWidth: this.timelineConfig.estilo.strokeWidth, // Usar el grosor actual
    lineCap: this.timelineConfig.estilo.lineCap, // Usar el estilo de línea actual
    draggable: false
  });
  
  this.timelineLayer.add(line);
  this.drawingElement = line;
}


updateLineStyles(): void {
  // Actualizar líneas en la capa de timeline
  this.timelineLayer.children?.forEach((child: Konva.Node) => {
    if (child instanceof Konva.Line) {
      child.stroke(this.timelineConfig.estilo.stroke);
      child.strokeWidth(this.timelineConfig.estilo.strokeWidth);
      child.lineCap(this.timelineConfig.estilo.lineCap);
    }
  });
  
  this.timelineLayer.batchDraw();
}

  /**
   * Dibujar rectángulo
   */
  private startDrawRect(pos: { x: number; y: number }): void {
    const rect = new Konva.Rect({
        x: Math.round(pos.x),
    y: Math.round(pos.y),
      width: 0,
      height: 0,
      fill: '#3498db',
      stroke: '#2980b9',
      strokeWidth: 2,
      draggable: false
    });
    
    this.decorLayer.add(rect);
    this.drawingElement = rect;
  }

  /**
   * Dibujar círculo
   */
  private startDrawCircle(pos: { x: number; y: number }): void {
    const circle = new Konva.Circle({
       x: Math.round(pos.x),
    y: Math.round(pos.y),
      radius: 0,
      fill: '#9b59b6',
      stroke: '#8e44ad',
      strokeWidth: 2,
      draggable: false
    });
    
    this.decorLayer.add(circle);
    this.drawingElement = circle;
  }

  /**
   * Dibujar zona de evento
   */
  private startDrawEventZone(pos: { x: number; y: number }): void {
    const zone = new Konva.Rect({
      x: Math.round(pos.x),
    y: Math.round(pos.y),
      width: 0,
      height: 0,
      fill: 'rgba(255, 255, 255, 0)',
      stroke: '#3e76e5ff',
      strokeWidth: 2,
      dash: [5, 5],
      draggable: false
    });
    
    this.eventsLayer.add(zone);
    this.drawingElement = zone;
  }

  /**
   * Agregar texto
   */
  private addText(pos: { x: number; y: number }): void {
    const text = new Konva.Text({
      x: pos.x,
      y: pos.y,
      text: 'Texto editable',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#2c3e50',
      draggable: true
    });
    
    this.decorLayer.add(text);
    this.makeElementInteractive(text);
    this.addDecorativeElement(text);
    this.decorLayer.batchDraw();
    
    // Cambiar a modo selección
    this.currentTool = 'select';
  }

  /**
   * Hacer elemento interactivo (draggable + selectable)
   */
  private makeElementInteractive(element: Konva.Shape): void {
    element.draggable(true);
    
    element.on('click', (e) => {
      e.cancelBubble = true;
      this.selectElement(element);
    });
    
    element.on('dblclick', (e) => {
      e.cancelBubble = true;
      if (element instanceof Konva.Text) {
        this.editText(element);
      }
    });
  }

  /**
   * Seleccionar elemento
   */
 private selectElement(element: Konva.Shape): void {
  // Si Ctrl está presionado, agregar a selección múltiple
  const isCtrlKey = (window.event as any)?.ctrlKey || (window.event as any)?.metaKey;
  
  if (isCtrlKey) {
    this.handleCtrlClick(element, true);
  } else {
    // Selección simple (comportamiento normal)
    this.transformer.nodes([element]);
    this.transformer.visible(true);
    this.configureTransformerForMultipleSelection();
    this.decorLayer.batchDraw();
  }
}
  /**
   * Editar texto
   */
  private editText(textNode: Konva.Text): void {
    const textPosition = textNode.absolutePosition();
    const stageBox = this.stage.container().getBoundingClientRect();
    
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = (stageBox.top + textPosition.y) + 'px';
    textarea.style.left = (stageBox.left + textPosition.x) + 'px';
    textarea.style.fontSize = textNode.fontSize() + 'px';
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.zIndex = '10000';
    
    textarea.focus();
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        textNode.text(textarea.value);
        document.body.removeChild(textarea);
        this.decorLayer.batchDraw();
      }
      
      if (e.key === 'Escape') {
        document.body.removeChild(textarea);
      }
    });
    
    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(textarea)) {
          textNode.text(textarea.value);
          document.body.removeChild(textarea);
          this.decorLayer.batchDraw();
        }
      }, 100);
    });
  }

  /**
   * Finalizar zona de evento
   */


 /* updateZoneStyle(zone: ZonaEvento, element: 'imagen' | 'titulo' | 'fecha' | 'descripcion', style: string, value: any): void {
  if (!zone.layout[element].estilos) {
    zone.layout[element].estilos = {};
  }
  (zone.layout[element].estilos as any)[style] = value;
  this.updateZoneVisualization(zone);
}*/



actualizarConfiguracionElemento(zone: ZonaEvento, elemento: ElementoEvento, propiedad: string, valor: any): void {
  (elemento.configuracion as any)[propiedad] = valor;
  this.actualizarElemento(zone, elemento);
}

actualizarRestriccionesElemento(zone: ZonaEvento, elemento: ElementoEvento): void {
  // Encontrar el grupo visual del elemento
  const grupo = this.eventsLayer.findOne((node: Konva.Node) => {
    return node.getAttr('elementId') === elemento.id;
  });

  if (grupo && grupo instanceof Konva.Group) {
    grupo.draggable(elemento.restricciones?.movable ?? true);
    
    // Si el elemento está seleccionado, actualizar transformer
    if (this.transformer.nodes().includes(grupo)) {
      this.transformer.enabledAnchors(
        elemento.restricciones?.resizable ? 
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : 
        []
      );
      this.transformer.rotateEnabled(elemento.restricciones?.rotatable ?? true);
    }
  }
  
  this.eventsLayer.batchDraw();
}


actualizarPropiedadElemento(zone: ZonaEvento, elemento: ElementoEvento, propiedad: keyof ElementoEvento, valor: any): void {
  // Redondear valores numéricos
  if (typeof valor === 'number') {
    valor = Math.round(valor);
  }
  
  (elemento as any)[propiedad] = valor;
  this.actualizarElemento(zone, elemento);
}


private finalizeEventZone(rect: Konva.Rect): void {
  // Redondear valores de posición y tamaño
  const x = Math.round(rect.x());
  const y = Math.round(rect.y());
  const width = Math.round(rect.width());
  const height = Math.round(rect.height());
  
  const zone: ZonaEvento = {
    id: `zone-${this.zoneCounter++}`,
    nombre: `Evento ${this.eventZones.length + 1}`,
    posicion: {
      x: x,
      y: y,
      anchoMaximo: width,
      altoMaximo: height
    },
    elementos: [],
    contenedor: {
      visible: false,
    },
    orden: this.eventZones.length + 1
  };
  
  this.eventZones.push(zone);
  this.selectedZone = zone;

  // Aplicar valores redondeados al rectángulo
  rect.x(x);
  rect.y(y);
  rect.width(width);
  rect.height(height);
  rect.draggable(true);
  rect.setAttr('zoneId', zone.id);
  
  // Agregar contenedor por defecto
  this.agregarElementoAZona(zone, 'contenedor');
  
  this.addZoneLabel(rect, zone.nombre);
  this.currentTool = 'select';
}
actualizarRestriccionMovable(zone: ZonaEvento, elemento: ElementoEvento, value: boolean): void {
  if (!elemento.restricciones) {
    elemento.restricciones = { movable: true, resizable: true, rotatable: true };
  }
  elemento.restricciones.movable = value;
  this.actualizarRestriccionesElemento(zone, elemento);
}

actualizarRestriccionResizable(zone: ZonaEvento, elemento: ElementoEvento, value: boolean): void {
  if (!elemento.restricciones) {
    elemento.restricciones = { movable: true, resizable: true, rotatable: true };
  }
  elemento.restricciones.resizable = value;
  this.actualizarRestriccionesElemento(zone, elemento);
}

actualizarRestriccionRotatable(zone: ZonaEvento, elemento: ElementoEvento, value: boolean): void {
  if (!elemento.restricciones) {
    elemento.restricciones = { movable: true, resizable: true, rotatable: true };
  }
  elemento.restricciones.rotatable = value;
  this.actualizarRestriccionesElemento(zone, elemento);
}

/**
 * Obtener valor de restricción de forma segura
 */
getRestriccionMovable(elemento: ElementoEvento): boolean {
  return elemento.restricciones?.movable ?? true;
}

getRestriccionResizable(elemento: ElementoEvento): boolean {
  return elemento.restricciones?.resizable ?? true;
}

getRestriccionRotatable(elemento: ElementoEvento): boolean {
  return elemento.restricciones?.rotatable ?? true;
}










 getIconForElementType(tipo: string): string {
  const icons = {
    'imagen': 'fas fa-image',
    'titulo': 'fas fa-heading',
    'fecha': 'fas fa-calendar',
    'descripcion': 'fas fa-paragraph',
    'personaje': 'fas fa-user', // ← NUEVO
    'link': 'fas fa-link', // ← NUEVO
    'contenedor': 'fas fa-square',
    'forma': 'fas fa-shapes'
  } as const; // 'as const' hace que TypeScript infiera los tipos literales

  // Usa una aserción de tipo para acceder de forma segura
  return (icons as any)[tipo] || 'fas fa-cube';
}

getElementTypeName(tipo: string): string {
  const names = {
    'imagen': 'Imagen',
    'titulo': 'Título',
    'fecha': 'Fecha',
    'personaje': 'Personaje', // ← NUEVO
    'link': 'Enlace', // ← NUEVO
    'descripcion': 'Descripción',
    'contenedor': 'Contenedor',
    'forma': 'Forma'
  } as const;

  return (names as any)[tipo] || 'Elemento';
}

  /**
   * Agregar etiqueta a zona de evento
   */
 private addZoneLabel(rect: Konva.Rect, label: string): void {
  const text = new Konva.Text({
    x: rect.x() + 5,
    y: rect.y() + 5,
    text: label,
    fontSize: 12,
    fontFamily: 'Arial',
    fill: '#3498db',
    fontStyle: 'bold'
  });
  text.setAttr('isLabel', true);
  
  this.eventsLayer.add(text);
  this.eventsLayer.batchDraw();
}

  /**
   * Agregar elemento decorativo
   */
  private addDecorativeElement(element: Konva.Shape): void {
    const decorElement: ElementoDecorativo = {
      id: `decor-${this.decorativeElements.length + 1}`,
      tipo: this.getElementType(element),
      bloqueado: false,
      konvaElement: this.serializeKonvaElement(element)
    };
    
    this.decorativeElements.push(decorElement);
  }

  /**
   * Obtener tipo de elemento
   */
  private getElementType(element: Konva.Shape): any {
    return element.getClassName().toLowerCase();
  }

  /**
   * Obtener icono para tipo de elemento
   */
  getIconForType(tipo: string): string {
    const icons: { [key: string]: string } = {
      'rect': 'square',
      'circle': 'circle',
      'text': 'font',
      'line': 'minus',
      'star': 'star'
    };
    return icons[tipo] || 'shapes';
  }

  /**
   * Serializar elemento Konva
   */
  private serializeKonvaElement(element: Konva.Shape): SerializedKonvaElement {
    const baseProps = {
      tipo: element.getClassName(),
      x: element.x(),
      y: element.y(),
      scaleX: element.scaleX(),
      scaleY: element.scaleY(),
      rotation: element.rotation()
    };

    switch (element.getClassName()) {
      case 'Rect':
        const rect = element as Konva.Rect;
        return {
          ...baseProps,
          width: rect.width(),
          height: rect.height(),
          fill: rect.fill(),
          stroke: rect.stroke(),
          strokeWidth: rect.strokeWidth(),
          cornerRadius: rect.cornerRadius()
        };
      
      case 'Circle':
        const circle = element as Konva.Circle;
        return {
          ...baseProps,
          radius: circle.radius(),
          fill: circle.fill(),
          stroke: circle.stroke(),
          strokeWidth: circle.strokeWidth()
        };
      
      case 'Text':
        const text = element as Konva.Text;
        return {
          ...baseProps,
          text: text.text(),
          fontSize: text.fontSize(),
          fontFamily: text.fontFamily(),
          fill: text.fill(),
          fontStyle: text.fontStyle()
        };
      
      case 'Line':
        const line = element as Konva.Line;
        return {
          ...baseProps,
          points: line.points(),
          stroke: line.stroke(),
          strokeWidth: line.strokeWidth(),
          lineCap: line.lineCap()
        };
      
      default:
        return baseProps;
    }
  }

  /**
   * Cambiar herramienta
   */
 selectTool(tool: ToolType): void {
  this.currentTool = tool;

  // Limpiar selección múltiple si se cambia de herramienta
  if (tool !== 'multi-select' && this.selectionRect) {
    this.selectionRect.destroy();
    this.selectionRect = null;
    this.selectionLayer.batchDraw();
  }
  
  // Deseleccionar elementos si no es modo selección
  if (tool !== 'select' && tool !== 'multi-select') {
    this.transformer.nodes([]);
    this.transformer.visible(false);
    this.decorLayer.batchDraw();
  }
  
  // Cambiar cursor para mejor feedback visual
  /*if (tool === 'multi-select') {
    this.stage.container().style.cursor = 'crosshair';
  } else if (tool === 'select') {
    this.stage.container().style.cursor = 'default';
  } else {
    this.stage.container().style.cursor = 'crosshair';
  }*/
}

  /**
   * Eliminar elemento seleccionado
   */
deleteSelected(): void {
  const selectedNodes = this.transformer.nodes();
  
  if (selectedNodes.length === 0) {
    console.log('⚠️ No hay elementos seleccionados');
    return;
  }

  selectedNodes.forEach(selected => {
    // Verificar si es un elemento de zona
    const elementId = selected.getAttr('elementId');
    const zoneId = selected.getAttr('zoneId');

    if (elementId && zoneId) {
      // Es un elemento dentro de una zona de evento
      const zone = this.eventZones.find(z => z.id === zoneId);
      if (zone) {
        const element = zone.elementos.find(e => e.id === elementId);
        if (element) {
          this.eliminarElementoDeZona(zone, element);
        }
      }
    } else {
      // Verificar si es una zona de evento (rectángulo con dash)
      const isEventZone = selected instanceof Konva.Rect && 
                         selected.dash() && 
                         selected.dash().length > 0;
      
      if (isEventZone) {
        // Buscar la zona por posición
        const zone = this.eventZones.find(z => 
          z.posicion.x === selected.x() && 
          z.posicion.y === selected.y()
        );
        if (zone) {
          this.deleteEventZone(zone);
        }
      } else {
        // Es un elemento decorativo normal
        const index = this.decorativeElements.findIndex(
          el => el.konvaElement.x === selected.x() && el.konvaElement.y === selected.y()
        );
        
        if (index > -1) {
          this.decorativeElements.splice(index, 1);
        }
        
        selected.destroy();
      }
    }
  });

  // Limpiar selección
  this.transformer.nodes([]);
  this.transformer.visible(false);
  
  this.decorLayer.batchDraw();
  this.eventsLayer.batchDraw();
}

  /**
   * Eliminar zona de evento
   */
 deleteEventZone(zone: ZonaEvento, showConfirm: boolean = true): void {
  if (showConfirm && !confirm(`¿Eliminar zona "${zone.nombre}" y todos sus elementos?`)) {
    return;
  }
  
  const index = this.eventZones.indexOf(zone);
  if (index > -1) {
    this.eventZones.splice(index, 1);
  }
  
  // Remover TODOS los elementos visuales asociados a la zona
  const nodesToRemove: Konva.Node[] = [];
  
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    const zoneId = child.getAttr('zoneId');
    
    // Verificar si el elemento pertenece a la zona que se está eliminando
    if (zoneId === zone.id) {
      nodesToRemove.push(child);
    }
    
    // También verificar por posición (para compatibilidad con elementos antiguos)
    const isZoneRect = child instanceof Konva.Rect && 
                       child.dash() && 
                       child.dash().length > 0 &&
                       child.x() === zone.posicion.x && 
                       child.y() === zone.posicion.y;
    
    const isZoneLabel = child instanceof Konva.Text &&
                        child.getAttr('isLabel') === true &&
                        child.x() === zone.posicion.x + 5 &&
                        child.y() === zone.posicion.y + 5;
    
    if (isZoneRect || isZoneLabel) {
      // Asegurarse de no duplicar la eliminación
      if (!nodesToRemove.includes(child)) {
        nodesToRemove.push(child);
      }
    }
  });

  // Eliminar todos los nodos identificados
  nodesToRemove.forEach(node => node.destroy());
  
  this.eventsLayer.batchDraw();
  this.selectedZone = null;
  
  console.log(`🗑️ Zona "${zone.nombre}" eliminada con todos sus elementos`);
}

  /**
   * Alternar modo vista previa
   */
 togglePreview(): void {
  this.previewMode = !this.previewMode;
  
  if (this.previewMode) {
    // Ocultar elementos de edición
    //this.transformer.visible(false);
    
    // Ocultar rectángulos de zonas de eventos
    this.hideZoneRectangles();
    
    // Mostrar ejemplo de eventos
    //this.renderPreviewEvents();
  } else {
    // Restaurar modo edición
    this.showZoneRectangles();
    //this.clearPreviewEvents();
  }
  
  this.stage.batchDraw();
}


private hideZoneRectangles(): void {
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    // Ocultar rectángulos de zonas (que tienen dash y son draggable)
    if (child instanceof Konva.Rect && 
        child.dash() && 
        child.dash().length > 0 &&
        child.draggable()) {
      child.visible(false);
    }

    if (child instanceof Konva.Text && child.getAttr('isLabel')) {
      child.visible(false);
    }
  });
}

private showZoneRectangles(): void {
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    // Mostrar rectángulos de zonas
    if (child instanceof Konva.Rect && 
        child.dash() && 
        child.dash().length > 0 &&
        child.draggable()) {
      child.visible(true);
    }

    if (child instanceof Konva.Text && child.getAttr('isLabel')) {
      child.visible(true);
    }
  });
}

  /**
   * Renderizar eventos de ejemplo en vista previa
   */
  private renderPreviewEvents(): void {
  this.eventZones.forEach((zone, index) => {
    const group = new Konva.Group({
      x: zone.posicion.x,
      y: zone.posicion.y
    });
    
    // Contenedor principal si existe
    if (zone.contenedor?.visible) {
      const container = new Konva.Rect({
        x: 0,
        y: 0,
        width: zone.posicion.anchoMaximo || 200,
        height: zone.posicion.altoMaximo || 100,
        fill: zone.contenedor.fill || '#ffffff',
        stroke: zone.contenedor.stroke || '#3498db',
        strokeWidth: zone.contenedor.strokeWidth || 2,
        cornerRadius: zone.contenedor.cornerRadius || 4
      });
      group.add(container);
    }
    
    // Renderizar elementos de la zona
    zone.elementos.forEach(elemento => {
      if (elemento.visible) {
        this.renderizarElementoPreview(group, zone, elemento, index);
      }
    });
    
    group.setAttr('isPreview', true);
    this.eventsLayer.add(group);
  });
  
  this.eventsLayer.batchDraw();
}

private renderizarElementoPreview(group: Konva.Group, zone: ZonaEvento, elemento: ElementoEvento, zoneIndex: number): void {
  const elemGroup = new Konva.Group({
    x: elemento.x,
    y: elemento.y,
    width: elemento.width,
    height: elemento.height,
    rotation: elemento.configuracion.rotation || 0
  });

  let shape: Konva.Shape;

  switch (elemento.tipo) {
    case 'imagen':
      shape = this.crearFormaImagen(elemento);
      break;

    case 'titulo':
      shape = new Konva.Text({
        width: elemento.width,
        height: elemento.height,
        text: `Evento ${zoneIndex + 1}`,
        fontSize: elemento.configuracion.fontSize || 16,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#2c3e50',
        align: elemento.configuracion.textAlign || 'left',
        fontStyle: elemento.configuracion.fontWeight || 'normal'
      });
      break;

    case 'fecha':
      shape = new Konva.Text({
        width: elemento.width,
        height: elemento.height,
        text: '2024',
        fontSize: elemento.configuracion.fontSize || 12,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#7f8c8d',
        align: elemento.configuracion.textAlign || 'left'
      });
      break;

    case 'descripcion':
      shape = new Konva.Text({
        width: elemento.width,
        height: elemento.height,
        text: 'Descripción del evento...',
        fontSize: elemento.configuracion.fontSize || 11,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#34495e',
        align: elemento.configuracion.textAlign || 'left'
      });
      break;

    case 'personaje': // ← NUEVO: Vista previa para personaje
      shape = new Konva.Text({
        width: elemento.width,
        height: elemento.height,
        text: 'Personaje importante',
        fontSize: elemento.configuracion.fontSize || 12,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#8e44ad',
        align: elemento.configuracion.textAlign || 'left'
      });
      break;

    case 'link': // ← NUEVO: Vista previa para enlace
      shape = new Konva.Text({
        width: elemento.width,
        height: elemento.height,
        text: elemento.configuracion.textoLink || '🔗 Ver más',
        fontSize: elemento.configuracion.fontSize || 11,
        fontFamily: elemento.configuracion.fontFamily || 'Arial',
        fill: elemento.configuracion.color || '#3498db',
        align: elemento.configuracion.textAlign || 'left',
        textDecoration: 'underline'
      });
      break;

    case 'contenedor':
    case 'forma':
      shape = this.crearFormaGeometrica(elemento);
      break;
  }

  if (shape) {
    elemGroup.add(shape);
    group.add(elemGroup);
  }
}

  /**
   * Limpiar eventos de vista previa
   */
  private clearPreviewEvents(): void {
  this.eventsLayer.children?.forEach((child: Konva.Node) => {
    if (child.getAttr('isPreview') || child.getAttr('elementId')) {
      child.destroy();
    }
  });
  
  this.eventsLayer.batchDraw();
}

  /**
   * Guardar plantilla
   */

 async saveTemplate(): Promise<void> {
  // Validaciones iniciales
  if (!this.templateName.trim()) {
    alert('Por favor, ingresa un nombre para la plantilla');
    return;
  }

  if (this.eventZones.length === 0) {
    alert('Por favor, define al menos una zona de evento');
    return;
  }

  if (!this.authService.isLoggedIn()) {
    alert('Debes iniciar sesión para guardar plantillas');
    return;
  }

  this.isSaving = true;

  try {
    // Obtener usuario actual y verificar si es premium
    const usuarioActual = await this.obtenerUsuarioActual();
    const usuarioId = usuarioActual?.id || 1;
    const esUsuarioPremium = this.authService.getUserPlan(); // Método que verifica si el usuario es premium

    // ✅ PASO 1: Serializar línea de tiempo (UNA SOLA VEZ)
    this.timelineConfig.elementosKonva = [];
    this.timelineLayer.children?.forEach((child: Konva.Node) => {
      if (child instanceof Konva.Shape) {
        this.timelineConfig.elementosKonva!.push(
          this.serializeKonvaElement(child)
        );
      }
    });

    // ✅ PASO 2: Generar portada automática si no hay una
    let portadaUrl: string | undefined;
    if (!this.portadaArchivo) {
      await this.generarPortadaDesdeProyecto();
    }

    // ✅ PASO 3: Generar thumbnail
    const thumbnail = await this.templateService.generateThumbnail(this.stage);

    // ✅ PASO 4: Preparar categoría
    const categoria = this.selectedCategoria || this.templateCategory;

    // ✅ PASO 5: Crear objeto de plantilla (SIN portadaUrl aún)
    const template: AdminTemplate = {
      nombre: this.templateName,
      descripcion: this.templateDescription,
      categoria: categoria,
      esPublica: this.isPublic,
      configuracionVisual: {
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        backgroundColor: this.backgroundColor,
        lineaDeTiempo: this.timelineConfig,
        zonasEventos: this.eventZones,
        elementosDecorativos: this.decorativeElements,
        // portadaUrl se agregará después de subirla
        portadaUrl: portadaUrl
      },
      metadatos: {
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        creadoPor: usuarioId,
        version: '1.0',
        vecesUsada: 0,
        thumbnail: thumbnail,
        // portadaUrl se agregará después
        portadaUrl: portadaUrl, // ✅ También en metadatos
        portada: this.portadaArchivo?.name,
        //esPremium: esUsuarioPremium // ✅ Nuevo campo para identificar plantillas premium
      }
    };

    console.log('💾 Guardando plantilla base...');
    console.log('👑 Estado premium del usuario:', esUsuarioPremium);

    let plantillaId: number;

    // ✅ PASO 6: Guardar/actualizar plantilla PRIMERO para obtener el ID
    if (this.currentTemplateId) {
      // Actualizar plantilla existente
      await lastValueFrom(
        this.templateService.updateTemplate(this.currentTemplateId, template)
      );
      plantillaId = this.currentTemplateId;
      console.log('✅ Plantilla base actualizada (ID:', plantillaId, ')');
    } else {
      // Crear nueva plantilla
      const response = await lastValueFrom(
        this.templateService.createTemplate(template)
      );
      plantillaId = response.id;
      this.currentTemplateId = plantillaId;
      console.log('✅ Plantilla base creada (ID:', plantillaId, ')');
    }

    // ✅ PASO 7: Ahora SÍ subir la portada (ya tenemos el ID garantizado)
    if (this.portadaArchivo && plantillaId) {
      try {
        console.log('📤 Subiendo portada de plantilla...');
        console.log('   Usuario ID:', usuarioId);
        console.log('   Plantilla ID:', plantillaId);
        console.log('   Archivo:', this.portadaArchivo.name);
        console.log('   Tipo de usuario:', esUsuarioPremium ? 'PREMIUM' : 'Estándar');
        
        let respuesta: any;
        
        // ✅ DECISIÓN: Subir portada según tipo de usuario
        if (esUsuarioPremium) {
          console.log('👑 Usuario premium - usando subirPortadaProyectoPremium');
          respuesta = await lastValueFrom(
            this.archivoService.subirPortadaProyectoPremium(
              this.portadaArchivo, 
              usuarioId, 
              plantillaId
            )
          );
        } else {
          console.log('👤 Usuario estándar - usando subirPortadaPlantillaAdmin');
          respuesta = await lastValueFrom(
            this.archivoService.subirPortadaPlantillaAdmin(
              this.portadaArchivo, 
              usuarioId, 
              plantillaId
            )
          );
        }

        const portadaUrl = this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
        console.log('✅ Portada subida exitosamente');
        console.log('   URL obtenida:', portadaUrl);
        console.log('   Método usado:', esUsuarioPremium ? 'Premium' : 'Estándar');

        // ✅ PASO 8: Actualizar el objeto template con la portada
        template.id = plantillaId; // Asegurar que tenga el ID
        template.metadatos.portadaUrl = portadaUrl;
        template.metadatos.portada = this.portadaArchivo.name;
        template.configuracionVisual.portadaUrl = portadaUrl;
        
        console.log('📝 Template con portada ANTES de enviar:', {
          id: template.id,
          metadatos_portadaUrl: template.metadatos.portadaUrl,
          configuracionVisual_portadaUrl: template.configuracionVisual.portadaUrl,
          //esPremium: template.metadatos.esPremium
        });
        
        const resultadoActualizacion = await lastValueFrom(
          this.templateService.updateTemplate(plantillaId, template)
        );
        
        console.log('✅ Plantilla actualizada con portada');
        console.log('📦 Respuesta del backend:', resultadoActualizacion);
        
      } catch (error) {
        console.error('❌ Error subiendo portada:', error);
        console.warn('⚠️ Plantilla guardada pero sin portada');
        // No fallar todo el guardado por la portada
      }
    } else {
      if (!this.portadaArchivo) {
        console.warn('⚠️ No hay archivo de portada para subir');
      }
      if (!plantillaId) {
        console.error('❌ No se pudo obtener el ID de la plantilla');
      }
    }

    // ✅ PASO 9: Mensaje de éxito
    const accion = this.currentTemplateId !== plantillaId ? 'creada' : 'actualizada';
    const tipoUsuario = esUsuarioPremium ? 'premium' : 'estándar';
    alert(`✅ Plantilla ${tipoUsuario} ${accion} correctamente`);

  } catch (error) {
    console.error('❌ Error guardando plantilla:', error);
    
    // Mensaje de error más descriptivo
    if (error instanceof Error) {
      alert(`Error al guardar la plantilla: ${error.message}`);
    } else {
      alert('Error al guardar la plantilla');
    }
  } finally {
    this.isSaving = false;
  }
}



/*async saveTemplate(): Promise<void> {
  // Validaciones iniciales
  if (!this.templateName.trim()) {
    alert('Por favor, ingresa un nombre para la plantilla');
    return;
  }

  if (this.eventZones.length === 0) {
    alert('Por favor, define al menos una zona de evento');
    return;
  }

  if (!this.authService.isLoggedIn()) {
    alert('Debes iniciar sesión para guardar plantillas');
    return;
  }

  this.isSaving = true;

  try {
    // Obtener usuario actual
    const usuarioActual = await this.obtenerUsuarioActual();
    const usuarioId = usuarioActual?.id || 1;

    // ✅ PASO 1: Serializar línea de tiempo (UNA SOLA VEZ)
    this.timelineConfig.elementosKonva = [];
    this.timelineLayer.children?.forEach((child: Konva.Node) => {
      if (child instanceof Konva.Shape) {
        this.timelineConfig.elementosKonva!.push(
          this.serializeKonvaElement(child)
        );
      }
    });

    // ✅ PASO 2: Generar portada automática si no hay una
    let portadaUrl: string | undefined;
    if (!this.portadaArchivo) {
      await this.generarPortadaDesdeProyecto();
    }

    // ✅ PASO 3: Generar thumbnail
    const thumbnail = await this.templateService.generateThumbnail(this.stage);

    // ✅ PASO 4: Preparar categoría
    const categoria = this.selectedCategoria || this.templateCategory;

    // ✅ PASO 5: Crear objeto de plantilla (SIN portadaUrl aún)
    const template: AdminTemplate = {
      nombre: this.templateName,
      descripcion: this.templateDescription,
      categoria: categoria,
      esPublica: this.isPublic,
      configuracionVisual: {
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        backgroundColor: this.backgroundColor,
        lineaDeTiempo: this.timelineConfig,
        zonasEventos: this.eventZones,
        elementosDecorativos: this.decorativeElements,
        // portadaUrl se agregará después de subirla
        portadaUrl: portadaUrl
      },
      metadatos: {
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        creadoPor: usuarioId,
        version: '1.0',
        vecesUsada: 0,
        thumbnail: thumbnail,
        // portadaUrl se agregará después
        portadaUrl: portadaUrl, // ✅ También en metadatos
        portada: this.portadaArchivo?.name
      }
    };

    console.log('💾 Guardando plantilla base...');

    let plantillaId: number;

    // ✅ PASO 6: Guardar/actualizar plantilla PRIMERO para obtener el ID
    if (this.currentTemplateId) {
      // Actualizar plantilla existente
      await lastValueFrom(
        this.templateService.updateTemplate(this.currentTemplateId, template)
      );
      plantillaId = this.currentTemplateId;
      console.log('✅ Plantilla base actualizada (ID:', plantillaId, ')');
    } else {
      // Crear nueva plantilla
      const response = await lastValueFrom(
        this.templateService.createTemplate(template)
      );
      plantillaId = response.id;
      this.currentTemplateId = plantillaId;
      console.log('✅ Plantilla base creada (ID:', plantillaId, ')');
    }

    // ✅ PASO 7: Ahora SÍ subir la portada (ya tenemos el ID garantizado)
    if (this.portadaArchivo && plantillaId) {
      try {
        console.log('📤 Subiendo portada de plantilla...');
        console.log('   Usuario ID:', usuarioId);
        console.log('   Plantilla ID:', plantillaId);
        console.log('   Archivo:', this.portadaArchivo.name);
        
        const respuesta = await lastValueFrom(
          this.archivoService.subirPortadaPlantillaAdmin(
            this.portadaArchivo, 
            usuarioId, 
            plantillaId
          )
        );

        const portadaUrl = this.archivoService.obtenerUrlDesdeRespuesta(respuesta);
        console.log('✅ Portada subida exitosamente');
        console.log('   URL obtenida:', portadaUrl);

        

        // ✅ PASO 8: Actualizar el objeto template con la portada
        template.id = plantillaId; // Asegurar que tenga el ID
        template.metadatos.portadaUrl = portadaUrl;
        template.metadatos.portada = this.portadaArchivo.name;
        template.configuracionVisual.portadaUrl = portadaUrl;
        
        console.log('📝 Template con portada ANTES de enviar:', {
          id: template.id,
          metadatos_portadaUrl: template.metadatos.portadaUrl,
          configuracionVisual_portadaUrl: template.configuracionVisual.portadaUrl,
          configuracionVisual_completo: template.configuracionVisual
        });
        
        console.log('🔍 configuracionVisual serializado:', 
          JSON.stringify(template.configuracionVisual)
        );
        
        const resultadoActualizacion = await lastValueFrom(
          this.templateService.updateTemplate(plantillaId, template)
        );
        
        console.log('✅ Plantilla actualizada con portada');
        console.log('📦 Respuesta del backend:', resultadoActualizacion);
        
      } catch (error) {
        console.error('❌ Error subiendo portada:', error);
        console.warn('⚠️ Plantilla guardada pero sin portada');
        // No fallar todo el guardado por la portada
      }
    } else {
      if (!this.portadaArchivo) {
        console.warn('⚠️ No hay archivo de portada para subir');
      }
      if (!plantillaId) {
        console.error('❌ No se pudo obtener el ID de la plantilla');
      }
    }

    // ✅ PASO 9: Mensaje de éxito
    const accion = this.currentTemplateId !== plantillaId ? 'creada' : 'actualizada';
    alert(`✅ Plantilla ${accion} correctamente`);

  } catch (error) {
    console.error('❌ Error guardando plantilla:', error);
    
    // Mensaje de error más descriptivo
    if (error instanceof Error) {
      alert(`Error al guardar la plantilla: ${error.message}`);
    } else {
      alert('Error al guardar la plantilla');
    }
  } finally {
    this.isSaving = false;
  }
}*/

onCategoriaChange(categoria: Categoria): void {
    this.selectedCategoria = categoria;
    this.templateCategory = categoria.nombre;
  }
  /*async saveTemplate(): Promise<void> {
  if (!this.templateName.trim()) {
    alert('Por favor, ingresa un nombre para la plantilla');
    return;
  }

  if (this.eventZones.length === 0) {
    alert('Por favor, define al menos una zona de evento');
    return;
  }

  this.isSaving = true;

  try {
    // Obtener usuario actual
    const usuarioActual = await this.obtenerUsuarioActual();
    const usuarioId = usuarioActual?.id || 1; // Usar 1 como fallback si no se encuentra usuario

    // Serializar línea de tiempo
    this.timelineConfig.elementosKonva = [];
    this.timelineLayer.children?.forEach((child: Konva.Node) => {
      if (child instanceof Konva.Shape) {
        this.timelineConfig.elementosKonva!.push(
          this.serializeKonvaElement(child)
        );
      }
    });

    // Generar thumbnail
    const thumbnail = await this.templateService.generateThumbnail(this.stage);

    // Crear objeto de plantilla
    const template: AdminTemplate = {
      nombre: this.templateName,
      descripcion: this.templateDescription,
      categoria: this.templateCategory,
      esPublica: this.isPublic,
      configuracionVisual: {
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        backgroundColor: this.backgroundColor,
        lineaDeTiempo: this.timelineConfig,
        zonasEventos: this.eventZones,
        elementosDecorativos: this.decorativeElements
      },
      metadatos: {
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        creadoPor: usuarioId, // Usar el ID del usuario obtenido
        version: '1.0',
        vecesUsada: 0,
        thumbnail: thumbnail
      }
    };

    // Guardar en servidor
    if (this.currentTemplateId) {
      await lastValueFrom(
        this.templateService.updateTemplate(this.currentTemplateId, template)
      );
      alert('✅ Plantilla actualizada correctamente');
    } else {
      const response = await lastValueFrom(
        this.templateService.createTemplate(template)
      );
      this.currentTemplateId = response.id;
      alert('✅ Plantilla guardada correctamente');
    }

  } catch (error) {
    console.error('❌ Error guardando plantilla:', error);
    alert('Error al guardar la plantilla');
  } finally {
    this.isSaving = false;
  }
}*/

  /**
   * Cargar plantilla existente
   */
  async loadTemplate(id: number): Promise<void> {
    
    
    try {
      
      const template = await lastValueFrom(
        this.templateService.getTemplateById(id)
      );

      this.currentTemplateId = template.id;
      this.templateName = template.nombre;
      this.templateDescription = template.descripcion;
      this.selectedCategoria = template.categoria;
      this.isPublic = template.esPublica;
      this.backgroundColor = template.configuracionVisual.backgroundColor;
      
      // Limpiar canvas
      this.clearCanvas();
      
      // Cargar configuración visual
     this.canvasWidth = template.configuracionVisual.canvasWidth;
      this.canvasHeight = template.configuracionVisual.canvasHeight;
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);
      this.updateBackground();
      
      // Cargar línea de tiempo
      this.timelineConfig = template.configuracionVisual.lineaDeTiempo;
      this.reconstructTimelineElements();
      
      // Cargar zonas de eventos
      this.eventZones = template.configuracionVisual.zonasEventos;
      this.reconstructEventZones();
      
      // Cargar elementos decorativos
      this.decorativeElements = template.configuracionVisual.elementosDecorativos || [];
      this.reconstructDecorativeElements();

    } catch (error) {
      console.error('❌ Error cargando plantilla:', error);
      alert('Error al cargar la plantilla');
    }
  }

  /**
   * Reconstruir elementos de línea de tiempo
   */
  private reconstructTimelineElements(): void {
    if (!this.timelineConfig.elementosKonva) return;

    this.timelineConfig.elementosKonva.forEach(element => {
      const konvaElement = this.reconstructKonvaElement(element);
      if (konvaElement) {
        this.timelineLayer.add(konvaElement);
        this.makeElementInteractive(konvaElement);
      }
    });

    this.timelineLayer.batchDraw();
  }

  /**
   * Reconstruir zonas de eventos
   */
private reconstructEventZones(): void {
  this.eventZones.forEach(zone => {
    // Renderizar cada elemento de la zona
    zone.elementos.forEach(elemento => {
      this.renderizarElemento(zone, elemento);
    });
    
    // Agregar etiqueta
    this.addZoneLabel(
      new Konva.Rect({
        x: zone.posicion.x,
        y: zone.posicion.y,
        width: zone.posicion.anchoMaximo || 200,
        height: zone.posicion.altoMaximo || 100
      }), 
      zone.nombre
    );
  });

  this.eventsLayer.batchDraw();
}

  /**
   * Reconstruir elementos decorativos
   */
  private reconstructDecorativeElements(): void {
    this.decorativeElements.forEach(decorElement => {
      const konvaElement = this.reconstructKonvaElement(decorElement.konvaElement);
      if (konvaElement) {
        this.decorLayer.add(konvaElement);
        this.makeElementInteractive(konvaElement);
      }
    });

    this.decorLayer.batchDraw();
  }

  /**
   * Reconstruir elemento Konva desde serialización
   */
  private reconstructKonvaElement(element: SerializedKonvaElement): Konva.Shape | null {
    switch (element.tipo) {
      case 'Rect':
        return new Konva.Rect({
          x: element.x,
          y: element.y,
          width: element['width']as number,
           height: element['height'] as number,
        fill: element['fill'] as string,
        stroke: element['stroke'] as string,
        strokeWidth: element['strokeWidth'] as number,
        cornerRadius: element['cornerRadius'] as number,
          scaleX: element.scaleX,
          scaleY: element.scaleY,
          rotation: element.rotation,
          draggable: true
        });
      
      case 'Circle':
        return new Konva.Circle({
          x: element.x,
          y: element.y,
          radius: element['radius'] as number,
        fill: element['fill'] as string,
        stroke: element['stroke'] as string,
        strokeWidth: element['strokeWidth'] as number,
          scaleX: element.scaleX,
          scaleY: element.scaleY,
          rotation: element.rotation,
          draggable: true
        });
      
      case 'Text':
        return new Konva.Text({
          x: element.x,
          y: element.y,
          text: element['text'] as string,
        fontSize: element['fontSize'] as number,
        fontFamily: element['fontFamily'] as string,
        fill: element['fill'] as string,
        fontStyle: element['fontStyle'] as string,
          scaleX: element.scaleX,
          scaleY: element.scaleY,
          rotation: element.rotation,
          draggable: true
        });
      
      case 'Line':
        return new Konva.Line({
          points: element['points'] as number[],
        stroke: element['stroke'] as string,
        strokeWidth: element['strokeWidth'] as number,
        lineCap: element['lineCap'] as CanvasLineCap,
          scaleX: element.scaleX,
          scaleY: element.scaleY,
          rotation: element.rotation,
          draggable: true
        });
      
      default:
        return null;
    }
  }

  /**
   * Limpiar canvas
   */
  private clearCanvas(): void {
    this.timelineLayer.destroyChildren();
    this.eventsLayer.destroyChildren();
    this.decorLayer.destroyChildren();
    
    // Re-agregar el transformer
    this.decorLayer.add(this.transformer);
    this.transformer.visible(false);
    
    this.eventZones = [];
    this.decorativeElements = [];
    this.selectedZone = null;
    
    this.stage.batchDraw();
  }

  /**
   * Nueva plantilla (limpiar todo)
   */
  newTemplate(): void {
    if (!confirm('¿Crear nueva plantilla? Se perderán los cambios no guardados.')) {
      return;
    }

    this.currentTemplateId = undefined;
    this.templateName = '';
    this.templateDescription = '';
    this.templateCategory = 'educativa';
    this.isPublic = true;
    this.backgroundColor = '#ffffff';
    this.zoneCounter = 1;
    
    this.clearCanvas();
    this.updateBackground();
  }

  /**
   * Exportar plantilla como JSON (para debugging)
   */
  /*exportTemplateAsJSON(): void {
    const template: AdminTemplate = {
      nombre: this.templateName,
      descripcion: this.templateDescription,
      categoria: this.templateCategory,
      esPublica: this.isPublic,
      configuracionVisual: {
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
        backgroundColor: this.backgroundColor,
        lineaDeTiempo: this.timelineConfig,
        zonasEventos: this.eventZones,
        elementosDecorativos: this.decorativeElements
      },
      metadatos: {
        fechaCreacion: new Date(),
        fechaModificacion: new Date(),
        creadoPor: 1,
        version: '1.0',
        vecesUsada: 0
      }
    };

    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-${this.templateName.replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }*/

  /**
   * Importar plantilla desde JSON (para debugging)
   */
  importTemplateFromJSON(event: any): void {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    try {
      const template: AdminTemplate = JSON.parse(e.target.result);
      
      this.templateName = template.nombre;
      this.templateDescription = template.descripcion;
      this.selectedCategoria = template.categoria;
      this.isPublic = template.esPublica;
      this.backgroundColor = template.configuracionVisual.backgroundColor;
      
      this.clearCanvas();
      
      this.canvasWidth = template.configuracionVisual.canvasWidth;
      this.canvasHeight = template.configuracionVisual.canvasHeight;
      this.stage.width(this.canvasWidth);
      this.stage.height(this.canvasHeight);
      this.updateBackground();
      
      // Asegurar que el tipo de timeline sea válido
      const timelineType = template.configuracionVisual.lineaDeTiempo.tipo;
      const validTypes = ['horizontal', 'vertical', 'curve', 'wave', 'zigzag', 'spiral', 'custom','s-curve'];
      
      if (validTypes.includes(timelineType)) {
        this.timelineConfig = {
          ...template.configuracionVisual.lineaDeTiempo,
          tipo: timelineType as any
        };
      } else {
        console.warn('Tipo de timeline inválido, usando horizontal por defecto');
        this.timelineConfig = {
          ...template.configuracionVisual.lineaDeTiempo,
          tipo: 'horizontal'
        };
      }
      
      // IMPORTANTE: Redibujar la timeline después de cargar
      this.redrawTimeline();
      
      this.eventZones = template.configuracionVisual.zonasEventos;
      this.reconstructEventZones();
      
      this.decorativeElements = template.configuracionVisual.elementosDecorativos || [];
      this.reconstructDecorativeElements();

      alert('✅ Plantilla cargada correctamente');
      
    } catch (error) {
      console.error('❌ Error importando plantilla:', error);
      alert('Error al importar la plantilla. Verifica el formato del archivo.');
    }
  };
  
  reader.readAsText(file);
  event.target.value = '';
}

  /**
   * Duplicar zona de evento seleccionada
   */
  duplicateSelectedZone(): void {
    if (!this.selectedZone) {
      alert('Selecciona una zona primero');
      return;
    }

    const newZone: ZonaEvento = {
      ...this.selectedZone,
      id: `zone-${this.zoneCounter++}`,
      nombre: `${this.selectedZone.nombre} (copia)`,
      posicion: {
        ...this.selectedZone.posicion,
        x: this.selectedZone.posicion.x + 20,
        y: this.selectedZone.posicion.y + 20
      },
      orden: this.eventZones.length + 1
    };

    this.eventZones.push(newZone);

    // Dibujar la nueva zona
    const rect = new Konva.Rect({
      x: newZone.posicion.x,
      y: newZone.posicion.y,
      width: newZone.posicion.anchoMaximo || 200,
      height: newZone.posicion.altoMaximo || 100,
      fill: 'rgba(52, 152, 219, 0.3)',
      stroke: '#3498db',
      strokeWidth: 2,
      dash: [5, 5],
      draggable: true
    });

    this.eventsLayer.add(rect);
    this.addZoneLabel(rect, newZone.nombre);
    this.makeElementInteractive(rect);
    this.eventsLayer.batchDraw();

    this.selectedZone = newZone;
  }

  /**
   * Cambiar orden de zona (subir/bajar)
   */
  changeZoneOrder(zone: ZonaEvento, direction: 'up' | 'down'): void {
    const index = this.eventZones.indexOf(zone);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [this.eventZones[index], this.eventZones[index - 1]] = 
      [this.eventZones[index - 1], this.eventZones[index]];
      
      // Actualizar orden
      this.eventZones[index].orden = index + 1;
      this.eventZones[index - 1].orden = index;
    } else if (direction === 'down' && index < this.eventZones.length - 1) {
      [this.eventZones[index], this.eventZones[index + 1]] = 
      [this.eventZones[index + 1], this.eventZones[index]];
      
      // Actualizar orden
      this.eventZones[index].orden = index + 1;
      this.eventZones[index + 1].orden = index + 2;
    }
  }

  /**
   * Alinear elementos seleccionados
   */
  alignSelected(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const nodes = this.transformer.nodes();
    if (nodes.length < 2) {
      alert('Selecciona al menos 2 elementos para alinear');
      return;
    }

    const firstNode = nodes[0];
    const firstBox = firstNode.getClientRect();

    nodes.forEach((node, index) => {
      if (index === 0) return; // Skip first node

      switch (alignment) {
        case 'left':
          node.x(firstBox.x);
          break;
        case 'center':
          const centerX = firstBox.x + firstBox.width / 2;
          const nodeBox = node.getClientRect();
          node.x(centerX - nodeBox.width / 2);
          break;
        case 'right':
          const rightX = firstBox.x + firstBox.width;
          const nodeBoxRight = node.getClientRect();
          node.x(rightX - nodeBoxRight.width);
          break;
        case 'top':
          node.y(firstBox.y);
          break;
        case 'middle':
          const centerY = firstBox.y + firstBox.height / 2;
          const nodeBoxMiddle = node.getClientRect();
          node.y(centerY - nodeBoxMiddle.height / 2);
          break;
        case 'bottom':
          const bottomY = firstBox.y + firstBox.height;
          const nodeBoxBottom = node.getClientRect();
          node.y(bottomY - nodeBoxBottom.height);
          break;
      }
    });

    this.decorLayer.batchDraw();
  }

  /**
   * Distribuir elementos seleccionados
   */
  distributeSelected(direction: 'horizontal' | 'vertical'): void {
    const nodes = this.transformer.nodes();
    if (nodes.length < 3) {
      alert('Selecciona al menos 3 elementos para distribuir');
      return;
    }

    const sorted = nodes.slice().sort((a, b) => {
      return direction === 'horizontal' 
        ? a.x() - b.x()
        : a.y() - b.y();
    });

    const first = sorted[0].getClientRect();
    const last = sorted[sorted.length - 1].getClientRect();

    const totalSpace = direction === 'horizontal'
      ? last.x - first.x - first.width
      : last.y - first.y - first.height;

    const gap = totalSpace / (sorted.length - 1);

    sorted.forEach((node, index) => {
      if (index === 0 || index === sorted.length - 1) return;

      if (direction === 'horizontal') {
        const nodeBox = node.getClientRect();
        node.x(first.x + first.width + gap * index - nodeBox.width / 2);
      } else {
        const nodeBox = node.getClientRect();
        node.y(first.y + first.height + gap * index - nodeBox.height / 2);
      }
    });

    this.decorLayer.batchDraw();
  }

  /**
   * Agrupar elementos seleccionados
   */
  groupSelected(): void {
    const nodes = this.transformer.nodes();
    if (nodes.length < 2) {
      alert('Selecciona al menos 2 elementos para agrupar');
      return;
    }

    const group = new Konva.Group({
      draggable: true
    });

    // Calcular el bounding box de todos los nodos
    let minX = Infinity, minY = Infinity;
    nodes.forEach(node => {
      const box = node.getClientRect();
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
    });

    // Mover nodos al grupo
    nodes.forEach(node => {
      const relX = node.x() - minX;
      const relY = node.y() - minY;
      node.x(relX);
      node.y(relY);
      node.moveTo(group);
    });

    group.x(minX);
    group.y(minY);
    
    this.decorLayer.add(group);
    this.transformer.nodes([group]);
    this.decorLayer.batchDraw();
  }

  /**
   * Desagrupar grupo seleccionado
   */
  ungroupSelected(): void {
    const selected = this.transformer.nodes()[0];
    if (!selected || !(selected instanceof Konva.Group)) {
      alert('Selecciona un grupo primero');
      return;
    }

    const children = selected.children?.slice() || [];
    const groupX = selected.x();
    const groupY = selected.y();

    children.forEach(child => {
      const absX = groupX + child.x();
      const absY = groupY + child.y();
      child.x(absX);
      child.y(absY);
      child.moveTo(this.decorLayer);
    });

    selected.destroy();
    this.transformer.nodes([]);
    this.decorLayer.batchDraw();
  }

  /**
   * Clonar elemento seleccionado
   */
  cloneSelected(): void {
    const selected = this.transformer.nodes()[0];
    if (!selected) {
      alert('Selecciona un elemento primero');
      return;
    }

    const clone = selected.clone({
      x: selected.x() + 20,
      y: selected.y() + 20
    });

    this.decorLayer.add(clone);
    this.makeElementInteractive(clone);
    this.addDecorativeElement(clone);
    
    this.transformer.nodes([clone]);
    this.decorLayer.batchDraw();
  }

  /**
   * Cambiar z-index (traer al frente / enviar al fondo)
   */
  changeZIndex(direction: 'front' | 'back'): void {
    const selected = this.transformer.nodes()[0];
    if (!selected) return;

    if (direction === 'front') {
      selected.moveToTop();
    } else {
      selected.moveToBottom();
    }

    this.decorLayer.batchDraw();
  }
}