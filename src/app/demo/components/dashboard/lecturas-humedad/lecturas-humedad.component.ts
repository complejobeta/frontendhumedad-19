import { Component, inject, OnInit } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { SHARED_FORMULARIOS_IMPORTS } from 'src/app/shared/shared-imports';
import { LecturahumedadService } from 'src/app/core/services/graficos/lecturahumedad/lecturahumedad.service';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { DropdownModule } from 'primeng/dropdown';
import { InputGroupModule } from 'primeng/inputgroup';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { ColorPickerModule } from 'primeng/colorpicker';
import { RippleModule } from 'primeng/ripple';
import { CardModule } from 'primeng/card';
import { Knob } from 'primeng/knob';
import { BadgeModule } from 'primeng/badge';
import { RangoGuiasService } from 'src/app/core/services/entidades/rango-guias/rango-guias.service';
import { IRangoGuias } from 'src/app/core/models/irango-guias';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';

// import { PrimeFlexModule } from 'primeflex';
// import { PrimeFlexModule } from 'primeflex'; // Para estilos de PrimeFlex
import { SelectModule } from 'primeng/select';
import { IftaLabelModule } from 'primeng/iftalabel';
import { FloatLabel } from "primeng/floatlabel"

import { MenuModule } from 'primeng/menu';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
// import { SwPush, } from '@angular/service-worker';
import { Subscription, take } from 'rxjs';

import { SwPush, } from '@angular/service-worker';
import { NotificationService } from 'src/app/core/services/pushnotification/notification.service';
//import { CommonModule } from '@angular/common';
//import 'echarts/theme/dark'; // Importa un tema
echarts.use([BarChart, GridComponent, CanvasRenderer, LineChart]);

@Component({
  selector: 'app-lecturas-humedad',
  imports: [SHARED_FORMULARIOS_IMPORTS,ToolbarModule, MenuModule,PanelModule, FloatLabel, IftaLabelModule,SelectModule,CardModule,BadgeModule, Knob, RippleModule, InputNumberModule, ColorPickerModule, CalendarModule, NgxEchartsDirective, ButtonModule, DropdownModule, MenubarModule, InputGroupModule, ToggleButtonModule, TagModule, TooltipModule],
  templateUrl: './lecturas-humedad.component.html',
  styleUrl: './lecturas-humedad.component.scss',
  providers: [
    provideEchartsCore({ echarts })
  ]
})
export class LecturasHumedadComponent implements OnInit { 
 
  configuraciones : any[] = []; //Lista de configuracion_procesadores
  seleccionableConfigId: number = 1; 
  fechaInicio: string = '';
  fechaFin: string = '';
  showTemperaturaData: boolean = false;
  showHumedadData: boolean = true;

  displayModal: boolean = false; // Controla la visibilidad del modal
  //promedios
  promedioHumedad: number = 0;
  promedioTemperatura: number = 0;
  //Detalles de configuración
  detallesConfig: any;
  
  rangosGuiasConfig: any[] = [];
  
  estadoSensorConfig: any;
  estadoBateriaUps: any;

  // Array de líneas de referencia
  referenceLines: { yAxis: number; color: string; type: string }[] = [];

  //Para push notification
  subscription!: Subscription;
  // private readonly VAPID_PUBLIC_KEY = 'BHmL8Yw1J-LvmkW_7eafcA6DSL14EfGwq91PXx6GiV3AJd5Rwzr2hlhFsJuscWZF0Bx0UDHKGFZBSqZQfxJ3__k';
  private readonly VAPID_PUBLIC_KEY = 'BEHxaLqVc_RRgYtf_03d5feWRL1dIT4NkKOHuSidsX_-yNBHTfIeG4Ef2HkgT2iZfsmaUPo7FPwJ11D_TvouMRc';

  constructor(
    private lecturahumedadService: LecturahumedadService, 
    private rangoGuiaService: RangoGuiasService,
    //Para push notification
    private swPush: SwPush,
    private notificationService: NotificationService,
  ) {
    // this.subscription = this.lecturahumedadService
  }
  // Valores temporales para la nueva línea
  lte: number = 10;
  color: string = '#FF0000';
  name: string = '';
  //Para lineas guias

  protected confirmationService = inject(ConfirmationService)
  protected messageService = inject(MessageService);
  selectedLineType: string = '';
  entidad: Partial<IRangoGuias> = {}; //Usamos partial para decir que la entidad no esta obligada a tener todas sus propiedades
  entidadcompleta!: IRangoGuias ;

  lineTypes = [
    { label: 'Línea Sólida ___', value: 'solid' },
    { label: 'Línea Punteada _ _ _', value: 'dashed' },
    { label: 'Línea Discontinua ......', value: 'dotted' }
  ];

  CargarDatosModal(entidad: IRangoGuias) {
    this.entidad = { ...entidad };
    //console.log("datos a editas:", entidad);
  }
  //Se usa para cuando se agrege o actualice una linea, y se elija otro color este actualiza su valor
  actualizarColor(event: any) {
    this.entidad.color = event.value; // Captura el color seleccionado
    //console.log('Color actualizado:', this.entidad.color);
  }

  guardarConfiguracion() {
    //Indicamos que el valor seleccionable es igual al atributo configuracion_procesador
    this.entidad.configuracion_procesador = this.seleccionableConfigId;
    //.log('Entidad antes de enviar:', this.entidad); //  Verifica en consola
    
    if(this.entidad?.id){
      this.confirmationService.confirm({
        message: '¿Estas seguro de actualizar este registro?',
        header: 'Confirmación de Actualización',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          //Actualizar
          this.rangoGuiaService.update(this.entidad.id, this.entidad).subscribe({
            next: (data) => {
              //console.log('actualizado de lineas:',data)
              this.obtenerRangosGuiasConfig(this.seleccionableConfigId);
              this.obtenerEstadoSensorConfig(this.seleccionableConfigId);
              this.obtenerBateriaUpsConfig(this.seleccionableConfigId);
              this.messageService.add({ severity: 'success', summary: 'Editado', detail: 'Registro editado correctamente'});
            },
            error: err => console.error('Error al actualizar:', err)
          });
        }
      })
    } else {
      this.confirmationService.confirm({
        message: '¿Estas seguro de agregar este nuevo registro?',
        header: 'Confirmación de Nuevo Registro',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.rangoGuiaService.create(this.entidad).subscribe({
            next: (data) => {
              //console.log('Linea Agregado:', data)
              this.obtenerRangosGuiasConfig(this.seleccionableConfigId);
              this.obtenerEstadoSensorConfig(this.seleccionableConfigId);
              this.obtenerBateriaUpsConfig(this.seleccionableConfigId);
              this.messageService.add({ severity: 'success', summary: 'Registrado', detail: 'Registro agregado correctamente'});
            },
            error: err => console.error('Error al agregar rangos:', err)
          });
        }
      })
    }
  }

  eliminar(id: number){
    this.confirmationService.confirm({
      message: '¿Estas seguro de eliminar este registro?',
      header: 'Confirmación Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {

        this.rangoGuiaService.delete(id).subscribe(() => {
          this.obtenerRangosGuiasConfig(this.seleccionableConfigId);
          this.obtenerEstadoSensorConfig(this.seleccionableConfigId);
          this.obtenerBateriaUpsConfig(this.seleccionableConfigId);
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Registro Eliminado correctamente'});
        });
      },
      reject: () => {
        console.log('Eliminación cancelada');
      }
    })
  }

  //inicia cargando los ids de configuracion en el select
  ngOnInit(): void {
    this.cargarConfiguraciones();

    if (this.seleccionableConfigId) {
      this.RefrescarDatos(this.seleccionableConfigId);
    }

    this.subscribeToNotifications();
  }

  CerrarModalRefrescarTodo(){
    if (this.seleccionableConfigId) {
      this.RefrescarDatos(this.seleccionableConfigId)
    }
  }

  RefrescarDatos(id: number) {
    this.cargarLecturasHumedad(id, this.fechaInicio, this.fechaFin);
    this.cargaPromedioLecturas(id, this.fechaInicio, this.fechaFin);
    this.obtenerDetallesConfig(id);
    this.obtenerRangosGuiasConfig(id);
    this.obtenerEstadoSensorConfig(id);
    this.obtenerBateriaUpsConfig(id);
  }

  //Carga las configuraciones en el select
  cargarConfiguraciones(): void {
    this.lecturahumedadService.configuracionProcesadores().subscribe(
      (data) => {
        this.configuraciones = data; //Asignamos la lista de configuraciones
      },
      (error) => {
        console.error("error al obtener las configuraciones", error);
      }
    );
  }

  //Al presionar uno de los elemenntos del select, carga las lecturas y le pasa el id del la conffiguracion seleccionada
  ConfiguracionesChange(): void {
    if (this. seleccionableConfigId) {
      //console.log('Selected Procesador ID:', this.seleccionableConfigId);
      this.RefrescarDatos(this.seleccionableConfigId);
    }
  }

  cargarLecturasHumedad(configuracionid: any, fechainicio: string, fechafin: string): void {
    this.lecturahumedadService.listaLecturasHumedad(configuracionid, fechainicio, fechafin).subscribe(
      (data) => {
        //console.log('datos sensor:', data);
        this.procesarLecturas(data);
      },
      (error) => {
        console.error('Error al obtener datos:', error);
      }
    );
  }

  cargaPromedioLecturas(configuracionid: any, fechainicio: string, fechafin: string): void {
    this.lecturahumedadService.promedioHumedadTemperatura(configuracionid, fechainicio, fechafin).subscribe(
      (data) => {
        //console.log('promedio de lecturas:', data);
        this.promedioHumedad = data.promedio_humedad;
        this.promedioTemperatura = data.promedio_temperatura;
      },
      (error) => {
        console.error('Error al obtener datos:', error);
      }
    )
  }

  obtenerDetallesConfig(configuracionId: number): void {
    this.lecturahumedadService.detallesConfiguraciones(configuracionId).subscribe(
      (data) => {
        this.detallesConfig = data;
        //console.log('detales de config:', this.detallesConfig);
      }
    )
  }


  obtenerRangosGuiasConfig(configuracionId: number): void {
    this.lecturahumedadService.RangoGuiasConfiguraciones(configuracionId).subscribe(
      (data) => {
        this.rangosGuiasConfig = data;
        //console.log('rangos guias de config:', this.rangosGuiasConfig);
      }
    )
  }

  obtenerEstadoSensorConfig(configuracionId: number): void {
    this.lecturahumedadService.EstadoConfiguraciones(configuracionId).subscribe(
      (data) => {
        this.estadoSensorConfig = data;
        //console.log();
        // console.log('Estado de sensor:', this.estadoSensorConfig);
      }
    )
  }

  obtenerBateriaUpsConfig(configuracionId: number): void {
    this.lecturahumedadService.EstadoBateriaConfig(configuracionId).subscribe(
      (data) => {
        this.estadoBateriaUps = data;
        //console.log();
        // console.log('Estado de bateria:', this.estadoBateriaUps);
      }
    )
  }
  
  loadDataWithDates(): void {
    if (this. seleccionableConfigId !== null) {
      //console.log('Id seleccionado:', this. seleccionableConfigId);
      //console.log('fecha inicio:', this.fechaInicio);
      //console.log('fecha final:', this.fechaFin);
      this.lecturahumedadService.listaLecturasHumedad(this. seleccionableConfigId, this.fechaInicio, this.fechaFin).subscribe(
        (data) => {
          //console.log('datos sensor con filtro:', data);
          this.procesarLecturas(data);
        },
        (error) => {
          console.error('Error al obtener datos:', error);
        }
      );
    }
  }

  procesarLecturas(data: any): void {
    const echarts = require('echarts');
    const chartDom = document.getElementById('main')!;
    const mychart = echarts.init(chartDom); //'dark'
    
    const fecha_hora = data.fecha_hora;
    const humedadSeries = data.humedad;
    const temperaturaSeries = data.temperatura;

    //console.log(temperaturaSeries);

    //Crear las series para el grafico
    const series = [];
    //const margin = 5; // Margen adicional
    let minValue = Infinity;
    let maxValue = -Infinity;

    if (this.showTemperaturaData) {
      this.showTemperaturaData = true;
      this.showHumedadData = false;
      for (let i = 0; i < 5; i++) {
        const data = temperaturaSeries[i];
      
        series.push({
          name:`N. Temp ${i + 1}`,
          type: 'line',
          data: temperaturaSeries[i],
          markLine: {
            silent: false,
            animation: true,
            data: this.generarMarkLines(),
            
          }
        });
      }
    }

    if (this.showHumedadData) {
      this.showHumedadData = true;
      this.showTemperaturaData = false;
      for (let i = 0; i < 5; i++) {

        const data = humedadSeries[i];
      
        // Calcular el mínimo y máximo de los datos actuales
        const currentMin = Math.min(...data);
        const currentMax = Math.max(...data);

        // Actualizar el mínimo y máximo global
        if (currentMin < minValue) {
          minValue = currentMin;
        }
        if (currentMax > maxValue) {
          maxValue = currentMax;
        }

        series.push({
          name:`N. Hum ${i + 1}`,
          type: 'line',
          data: humedadSeries[i],
          markLine: {
            silent: false,
            data: this.generarMarkLines(),
            animation: true,
          }
        });
      }
    }
    //console.log(series);
    
    const option = {
      //backgroundColor: '#232526', //roundColor: '#0f375f',
      // title: {
      //   text: 'Gráfico', //Titulo del grafico
      //   left: '1%', //Esto es para aplicar negrita
      //   // textStyle: {
      //   //   color: '#ccc'
      //   // }
      // },
      tooltip: {
        trigger: 'axis', //Linea de guia vertical al cursar el grafico (simplifica la visualización de datos ya que no tienes que cursar al punto especifico, sino que es más dinamico)
        confine: true
      },
      grid: {
        left: '3%',    // Márgenes más ajustados en móviles
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,  // ¡Importante! Evita que las etiquetas se salgan
      },
      legend: {
        data: series.map((s) => s.name), //Nombre de las series para las leyendas
        //pageIconSize: 10,
        //pageTextStyle: { fontSize: 10 },
        type: 'scroll',  // Permite desplazamiento si hay muchas leyendas
        //top: window.innerWidth < 768 ? 'bottom' : '7%',
        textStyle: {
          fontSize: window.innerWidth < 768 ? 12 : 14  // Ajuste del tamaño de texto
        }
      },
      xAxis: {
        type: 'category',
        data: fecha_hora,
        rotate: 45,         // Rotar etiquetas si es necesario
        fontSize: 10,       // Tamaño reducido en móviles
        //splitLine: { show: true }, //Con eso se marcan lineas de forma vertical
        // textStyle: {
        //   color: '#ccc'
        // }
      },
      yAxis: {},
      toolbox: { //Esto funciona para habilitar opciones interactivas en el grafico
        //right: 10, //Posiciona al lado izquierdo las opciones a habilitar
        feature: { //Opciones
          dataZoom: { //Para poder realizar zoom al grafico
            yAxisIndex: 'none'
          },
          dataView: { readOnly: false },
          restore: {}, //Restaurar el grafico a su posición inicial
          saveAsImage: {} //Habilita el la exportación del grafico en formato png
        },
        // textStyle: {
        //   color: '#ccc'
        // }
      },
      dataZoom: [ //Configuracion adicional de zoom
        // {
        //   startValue: '2025-01-30 12:00:17' //Valor por el cual iniciará mostrando por defecto
        // },
        {type: 'inside'}, //permite deslizarnos/navegación por el grafico
        { type: 'slider' }, // Para desktops
      ],
      series: series,
    };
    mychart.setOption(option);
  }

  showHumedad(): void {
    this.showHumedadData = true;
    this.showTemperaturaData = false;
    if (this. seleccionableConfigId !== null) {
      this.cargarLecturasHumedad(this.seleccionableConfigId, this.fechaInicio, this.fechaFin);
    }
  }

  showTemperatura(): void {
    this.showHumedadData = false;
    this.showTemperaturaData = true;
    if (this. seleccionableConfigId !== null) {
      this.cargarLecturasHumedad(this.seleccionableConfigId, this.fechaInicio, this.fechaFin);
    } 
  }

  //para generar el markline dinamicamente
  generarMarkLines(){
    return this.rangosGuiasConfig.filter(range => range.lte !== undefined)
    .map(range => ({
      name: range.name, 
      yAxis: parseFloat(range.lte), 
      label: {
        show: true,  // Mostrar el nombre en la gráfica
        formatter: range.name,  // Nombre visible en la línea
        position: "end" // Ubicación de la etiqueta
      },
      lineStyle: { color: range.color, type: range.type } }
    ));
  }
  
  abrirModal(){
    this.displayModal = true;
    this.entidad = {} //Limpia el formulario
  }
  
  estadoLegible: { [key: string]: string } = {
    asistio: 'Conectado',
    cancelada: 'Fallo de lectura'
  };

  getColorEstado(tipo: string): 'success' | 'danger' |'secondary' | 'warn' | 'info' | 'contrast' {
    // const hoy = new Date();   //Fecha del sistema
    // const fecha = new Date(fecha_crea);  //Fecha traide del registro
    // const diferencia = hoy.getTime() - fecha.getTime();  //Obtenemos la diferencia en milisegundos
    // const diferenciaMin = Math.floor(diferencia / 60000); //60,000 milisengundos = 1 minuto
    // console.log("Milisegundos",diferenciaMin);
    // if (diferenciaMin > 20){
    //   return 'info';
    // }

    switch (tipo) {
      case 'Exitoso':
        return 'success';
      case 'Fallo':
        return 'warn';
      case 'Desconectado':
        return 'danger';
      default:
        return 'info';
    };
  }

  getIconEstado(tipo: string): string {
    switch (tipo) {
      case 'Exitoso':
        return 'pi pi-check-circle';
      case 'Fallo':
        return 'pi pi-exclamation-triangle';
      case 'Desconectado':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-info-circle';
    }
  }

  getTooltipEstado(tipo: string): string {
    switch (tipo) {
      case 'Exitoso':
        return 'El envio de lectura fue exitoso';
      case 'Fallo':
        return 'El sensor no a enviado lecturas';
      case 'Desconectado':
        return 'Sin wifi/apagado';
      default:
        return 'Estado desconocido';
    }
  }

  cerrarModal(){
    this.displayModal = false;
    if (this. seleccionableConfigId !== null) {
      //console.log('Selected Procesador ID:', this.seleccionableConfigId);
      this.cargarLecturasHumedad(this. seleccionableConfigId, this.fechaInicio, this.fechaFin);
    }
  }

  subscribeToNotifications() {
    if(this.swPush.isEnabled ){

      // 1. Verificamos si ya existe una suscripción
      this.swPush.subscription.pipe(take(1)).subscribe(subscription => {
        
        if(!subscription){
          this.swPush.requestSubscription({
              serverPublicKey: this.VAPID_PUBLIC_KEY,
          })
          .then(sub => {
            console.log("Navegador suscrito a Push Service:", sub);
            
            // 2. Enviamos el objeto 'sub' DIRECTAMENTE al backend.
            // El backend ya sabe leer 'endpoint' y 'keys' de este objeto.
            this.notificationService.addPushSubscriber(sub).subscribe({
              next: () => console.log("Suscripción registrada en BD correctamente"),
              error: err => console.error("Falló registrar la suscripción en BD", err)
            });
          })
          .catch(err => console.error("El usuario bloqueó las notificaciones o falló el registro:", err));
        }
        else{
          console.log("El usuario ya estaba suscrito anteriormente");
        }
      });
      
      // 3. Manejo de Clicks (Cuando el usuario toca la notificación)
      this.swPush.notificationClicks.subscribe({
        next : (payload) =>{
          console.log("Notificación clickeada:", payload);
          // La URL viene dentro de 'data' según nuestro backend
          const url = payload.notification.data?.url;
          if (url) {
            window.open(url, '_blank');
          }
        }
      });
    }
    else{
      console.log("Service Workers no soportados o deshabilitados en este navegador.")
    }
  }

  // urlBase64ToUint8Array (base64String : string) {
  //   const padding = '='.repeat((4 - base64String.length % 4) % 4)
  //   const base64 = (base64String + padding)
  //           .replace(/\-/g, '+')
  //           .replace(/_/g, '/')

  //   const rawData = window.atob(base64)
  //   const outputArray = new Uint8Array(rawData.length)

  //   for (let i = 0; i < rawData.length; ++i) {
  //     outputArray[i] = rawData.charCodeAt(i)
  //   }
  //   return outputArray;
  // }

  // loadVersionBrowser () {
  //   if ("userAgentData" in navigator) {
  //     // navigator.userAgentData is not available in
  //     // Firefox and Safari
  //     const uaData = (navigator as any)['userAgentData'];
  //     // Outputs of navigator.userAgentData.brands[n].brand are e.g.
  //     // Chrome: 'Google Chrome'
  //     // Edge: 'Microsoft Edge'
  //     // Opera: 'Opera'
  //     let browsername = '';
  //     let browserversion = '';
  //     let chromeVersion: string  | null = null;
  //     for (let i = 0; i < uaData.brands.length; i++) {
  //       const brand = uaData!.brands[i].brand;
  //       browserversion = uaData.brands[i].version;
  //       if (brand.match(/opera|chrome|edge|safari|firefox|msie|trident/i) !== null) {
  //         // If we have a chrome match, save the match, but try to find another match
  //         // E.g. Edge can also produce a false Chrome match.
  //         if (brand.match(/chrome/i) !== null) {
  //           chromeVersion = browserversion;
  //         }
  //         // If this is not a chrome match return immediately
  //         else {
  //           browsername = brand.substr(brand.indexOf(' ')+1);
  //           return {
  //             name: browsername,
  //             version: browserversion
  //           }
  //         }
  //       }
  //     }
  //     // No non-Chrome match was found. If we have a chrome match, return it.
  //     if (chromeVersion !== null) {
  //       return {
  //         name: "chrome",
  //         version: chromeVersion
  //       }
  //     }
  //   }
  //   // If no userAgentData is not present, or if no match via userAgentData was found,
  //   // try to extract the browser name and version from userAgent
  //   const userAgent = navigator.userAgent;
  //   const M = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  //   // const ua = userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  //   let tem;
  //   if (/trident/i.test(M[1])) {
  //     tem = /\brv[ :]+(\d+)/g.exec(userAgent) || [];
  //     return {name: 'IE', version: (tem[1] || '')};
  //   }
  //   if (M[1] === 'Chrome') {
  //     tem = userAgent.match(/\bOPR\/(\d+)/);
  //     if (tem != null) {
  //       return {name: 'Opera', version: tem[1]};
  //     }
  //   }

  //   const name = M[1] || navigator.appName;
  //   const version = M[2] || navigator.appVersion;
  //   return { name, version };
  //   // M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  //   // if ((tem = userAgent.match(/version\/(\d+)/i)) != null) {
  //   //   M.splice(1, 1, tem[1]);
  //   // }
  //   // return {
  //   //   name: M[0],
  //   //   version: M[1]
  //   // };
  // }
}