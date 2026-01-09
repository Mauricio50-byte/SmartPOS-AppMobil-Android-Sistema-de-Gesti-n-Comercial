import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss'],
  standalone: false
})
export class ConfiguracionComponent implements OnInit {
  activeTab: 'usuario' | 'ayuda' = 'usuario';

  contactos = [
    {
      nombre: 'Mauro',
      rol: 'Soporte Técnico',
      qrImage: 'assets/mauro_qr.jpeg',
      mensaje: 'Escanea el código para contactar a Mauro por WhatsApp.'
    },
    {
      nombre: 'Jesus Vega',
      rol: 'Soporte Técnico',
      qrImage: 'assets/jesus_qr.jpeg',
      mensaje: 'Escanea el código para contactar a Jesus por WhatsApp.'
    }
  ];

  constructor() { }

  ngOnInit() {}

  segmentChanged(ev: any) {
    this.activeTab = ev.detail.value;
  }
}
