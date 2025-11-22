import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LecturahumedadService {
  private apiUrl = environment.apiUrl;
  private lecturaurl = `${this.apiUrl}/obtener_lecturas_formateada_idconfig/`;
  private lecturPromedioaurl = `${this.apiUrl}/obtener_promedio_lecturas_idconfig_semanal/`;
  private configuracionUrl = `${this.apiUrl}/Configuracion_listar/`;
  private detalleconfiguracionUrl = `${this.apiUrl}/obtener_detalles_configuracion/`;
  private RangoGuiasConfiguracionesUrl = `${this.apiUrl}/ListarRangoGuiaIdConfig/`;
  private EstadoConfiguracionesUrl = `${this.apiUrl}/ListarEstadoSensorIdConfig/`;
  private EstadoBateriaUpsUrl = `${this.apiUrl}/ListarEstadoBateriaIdConfig/`;

  constructor(private httpClient: HttpClient) { }

  configuracionProcesadores(): Observable<any> {
    return this.httpClient.get<any>(this.configuracionUrl)
  }
  
  listaLecturasHumedad(configuracionid: number, fechaInicio?: string, fechaFin?: string): Observable<any> {
    const params: any = {
      configuracion_id: configuracionid.toString(),
    };
    
    if (fechaInicio && fechaFin){
      params.fecha_inicio = fechaInicio;
      params.fecha_fin = fechaFin;
    }

    return this.httpClient.get<any>(`${this.lecturaurl}`, { params });
  }

  promedioHumedadTemperatura(configuracionid: number, fechaInicio?: string, fechaFin?: string): Observable<any> {

    let params = new HttpParams().set('configuracion_id', configuracionid.toString());
    
    if(fechaInicio) params = params.set('configuracion_id', configuracionid)
    if(fechaFin) params = params.set('configuracion_id', configuracionid)

    return this.httpClient.get<any>(`${this.lecturPromedioaurl}`, { params });
  }

  /**
   * Obtener detalles de configuración por ID
   * @param configuracionId ID de la configuración a consultar
   * @returns Observable con los datos obtenidos
   */

  detallesConfiguraciones(configuracionId: number): Observable<any> {
    const params = new HttpParams().set('configuracion_id', configuracionId.toString());
    return this.httpClient.get<any>(this.detalleconfiguracionUrl, { params });
  }

  /**
   * Obtener detalles de configuración por ID
   * @param configuracionId ID de la configuración a consultar
   * @returns Observable con los datos obtenidos
   */
  RangoGuiasConfiguraciones(configuracionId: number): Observable<any> {
    const params = new HttpParams().set('configuracion_procesador', configuracionId.toString());
    return this.httpClient.get<any>(this.RangoGuiasConfiguracionesUrl, { params });
  }

  /**
   * Obtener detalles de configuración por ID
   * @param configuracionId ID de la configuración a consultar
   * @returns Estado del sensor
   *    
   * */
  EstadoConfiguraciones(configuracionId: number): Observable<any> {
    const params = new HttpParams().set('configuracion_procesador', configuracionId.toString());
    return this.httpClient.get<any>(this.EstadoConfiguracionesUrl, { params });
  }

  EstadoBateriaConfig(configuracionId: number): Observable<any> {
    const params = new HttpParams().set('configuracion_procesador', configuracionId.toString());
    return this.httpClient.get<any>(this.EstadoBateriaUpsUrl, { params });
  }
}