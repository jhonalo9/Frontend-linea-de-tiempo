// archivo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface UploadResponse {
  url: string;
  nombreOriginal: string;
  tamaño: number;
  tipo: string;
  tipoUsuario: string;
  esPlantilla: boolean;
}

export interface ListaArchivosResponse {
  archivos: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ArchivoService {
  private apiUrl = `${environment.apiUrl}/archivos`;

  constructor(private http: HttpClient) {}

  /**
   * Subir archivo al servidor con la nueva estructura
   */
  subirArchivo(
    archivo: File, 
    usuarioId: number, 
    proyectoId: number, 
    tipo: 'portadas' | 'assets',
    tipoUsuario: 'users' | 'admins' | 'users-premium',
    esPlantilla: boolean = false
  ): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('usuarioId', usuarioId.toString());
    formData.append('proyectoId', proyectoId.toString());
    formData.append('tipo', tipo);
    formData.append('tipoUsuario', tipoUsuario);
    formData.append('esPlantilla', esPlantilla.toString());

    return this.http.post<UploadResponse>(`${this.apiUrl}/subir`, formData);
  }

  // ========== MÉTODOS PARA USUARIOS REGULARES (users) ==========

  /**
   * Subir portada de proyecto (users)
   */
  subirPortadaProyectoUser(
    archivo: File, 
    usuarioId: number, 
    proyectoId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, usuarioId, proyectoId, 'portadas', 'users', false);
  }

  /**
   * Subir asset de proyecto (users)
   */
  subirAssetProyectoUser(
    archivo: File, 
    usuarioId: number, 
    proyectoId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, usuarioId, proyectoId, 'assets', 'users', false);
  }

  // ========== MÉTODOS PARA ADMINS ==========

  /**
   * Subir portada de plantilla (admins)
   */
  subirPortadaPlantillaAdmin(
    archivo: File, 
    adminId: number, 
    plantillaId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, adminId, plantillaId, 'portadas', 'admins', true);
  }

  // ========== MÉTODOS PARA USUARIOS PREMIUM ==========

  /**
   * Subir portada de proyecto (users-premium)
   */
  subirPortadaProyectoPremium(
    archivo: File, 
    usuarioId: number, 
    proyectoId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, usuarioId, proyectoId, 'portadas', 'users-premium', false);
  }

  /**
   * Subir asset de proyecto (users-premium)
   */
  subirAssetProyectoPremium(
    archivo: File, 
    usuarioId: number, 
    proyectoId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, usuarioId, proyectoId, 'assets', 'users-premium', false);
  }

  /**
   * Subir portada de plantilla (users-premium)
   */
  subirPortadaPlantillaPremium(
    archivo: File, 
    usuarioId: number, 
    plantillaId: number
  ): Observable<UploadResponse> {
    return this.subirArchivo(archivo, usuarioId, plantillaId, 'portadas', 'users-premium', true);
  }

  /**
   * Obtener URL completa del archivo
   */
  obtenerUrlArchivo(
  tipoUsuario: 'users' | 'admins' | 'users-premium',
  usuarioId: number,
  proyectoId: number,
  tipo: 'portadas' | 'assets',
  nombreArchivo: string,
  esPlantilla: boolean = false,
  download: boolean = false // ✅ NUEVO PARÁMETRO
): string {
  const baseUrl = environment.apiUrl;
  
  // Construir URL base
  let url = `${baseUrl}/archivos/${tipoUsuario}/${usuarioId}/${proyectoId}/${tipo}/${nombreArchivo}`;
  
  // Agregar query params si es necesario
  const params: string[] = [];
  
  if (esPlantilla) {
    params.push('esPlantilla=true');
  }
  
  if (download) {
    params.push('download=true');
  }
  
  // Agregar params a la URL
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
}

  // ========== MÉTODOS DE CONVENIENCIA PARA OBTENER URLs ==========

  /**
   * Obtener URL de portada de proyecto (users)
   */
  obtenerUrlPortadaProyectoUser(
    usuarioId: number,
    proyectoId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('users', usuarioId, proyectoId, 'portadas', nombreArchivo, false);
  }

  /**
   * Obtener URL de asset de proyecto (users)
   */
  obtenerUrlAssetProyectoUser(
    usuarioId: number,
    proyectoId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('users', usuarioId, proyectoId, 'assets', nombreArchivo, false);
  }

  /**
   * Obtener URL de portada de plantilla (admin)
   */
  obtenerUrlPortadaPlantillaAdmin(
    adminId: number,
    plantillaId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('admins', adminId, plantillaId, 'portadas', nombreArchivo, true);
  }

  /**
   * Obtener URL de portada de proyecto (users-premium)
   */
  obtenerUrlPortadaProyectoPremium(
    usuarioId: number,
    proyectoId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('users-premium', usuarioId, proyectoId, 'portadas', nombreArchivo, false);
  }

  /**
   * Obtener URL de asset de proyecto (users-premium)
   */
  obtenerUrlAssetProyectoPremium(
    usuarioId: number,
    proyectoId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('users-premium', usuarioId, proyectoId, 'assets', nombreArchivo, false);
  }

  /**
   * Obtener URL de portada de plantilla (users-premium)
   */
  obtenerUrlPortadaPlantillaPremium(
    usuarioId: number,
    plantillaId: number,
    nombreArchivo: string
  ): string {
    return this.obtenerUrlArchivo('users-premium', usuarioId, plantillaId, 'portadas', nombreArchivo, true);
  }


  obtenerUrlPortada(
  usuarioId: number,
  proyectoId: number,
  nombreArchivo: string,
  tipoUsuario: 'users' | 'admins' | 'users-premium' = 'users'
): string {
  return this.obtenerUrlArchivo(
    tipoUsuario,
    usuarioId,
    proyectoId,
    'portadas',
    nombreArchivo,
    false, // No es plantilla
    false  // No forzar descarga
  );
}
  /**
   * Eliminar archivo
   */
  eliminarArchivo(
    tipoUsuario: 'users' | 'admins' | 'users-premium',
    usuarioId: number,
    proyectoId: number,
    tipo: 'portadas' | 'assets',
    nombreArchivo: string,
    esPlantilla: boolean = false
  ): Observable<any> {
    const params = new HttpParams()
      .set('tipoUsuario', tipoUsuario)
      .set('usuarioId', usuarioId.toString())
      .set('proyectoId', proyectoId.toString())
      .set('tipo', tipo)
      .set('nombreArchivo', nombreArchivo)
      .set('esPlantilla', esPlantilla.toString());

    return this.http.delete(`${this.apiUrl}/eliminar`, { params });
  }

  /**
   * Listar archivos de un directorio
   */
  listarArchivos(
    tipoUsuario: 'users' | 'admins' | 'users-premium',
    usuarioId: number,
    proyectoId: number,
    tipo: 'portadas' | 'assets',
    esPlantilla: boolean = false
  ): Observable<ListaArchivosResponse> {
    const url = `${this.apiUrl}/listar/${tipoUsuario}/${usuarioId}/${proyectoId}/${tipo}?esPlantilla=${esPlantilla}`;
    return this.http.get<ListaArchivosResponse>(url);
  }

  /**
   * Método de conveniencia para obtener la URL desde una respuesta de upload
   */
  obtenerUrlDesdeRespuesta(respuesta: UploadResponse): string {
  try {
    // Parsear la URL relativa de la respuesta
    const urlRelativa = respuesta.url.split('?')[0]; // Remover query params si existen
    const partes = urlRelativa.split('/');
    
    // Validar estructura
    if (partes.length < 7) {
      console.error('❌ URL con formato inválido:', respuesta.url);
      return respuesta.url; // Retornar URL original como fallback
    }
    
    const tipoUsuario = partes[2] as 'users' | 'admins' | 'users-premium';
    const usuarioId = parseInt(partes[3]);
    const proyectoId = parseInt(partes[4]);
    const tipo = partes[5] as 'portadas' | 'assets';
    const nombreArchivo = partes[6];

    console.log('📊 Construyendo URL desde respuesta:', {
      tipoUsuario,
      usuarioId,
      proyectoId,
      tipo,
      nombreArchivo,
      esPlantilla: respuesta.esPlantilla
    });

    return this.obtenerUrlArchivo(
      tipoUsuario,
      usuarioId,
      proyectoId,
      tipo,
      nombreArchivo,
      respuesta.esPlantilla,
      false // No forzar descarga
    );
  } catch (error) {
    console.error('❌ Error construyendo URL desde respuesta:', error);
    return respuesta.url; // Retornar URL original como fallback
  }
}}