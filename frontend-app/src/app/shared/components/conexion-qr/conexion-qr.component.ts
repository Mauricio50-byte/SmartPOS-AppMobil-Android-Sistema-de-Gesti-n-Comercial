import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-conexion-qr',
    templateUrl: './conexion-qr.component.html',
    styleUrls: ['./conexion-qr.component.scss'],
    standalone: false
})
export class ConexionQrComponent implements OnInit, AfterViewInit {
    @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

    urlPublica = '';
    urlQr = '';
    
    constructor(
        private modalCtrl: ModalController
    ) { }

    ngOnInit() {
        // Inicializar vacío para obligar a pegar el nuevo enlace
        this.urlPublica = '';
        this.urlQr = '';
    }

    ngAfterViewInit(): void {
        this.limpiarCanvas();
    }

    generarQr() {
        if (!this.qrCanvas) return;

        // Guardar configuración
        if (this.urlPublica) {
            localStorage.setItem('pos_public_url', this.urlPublica);
        }

        if (!this.urlPublica || this.urlPublica.length < 5) {
            this.urlQr = ''; 
            this.limpiarCanvas();
            return;
        }

        // Asegurar protocolo
        let baseUrl = this.urlPublica;
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
        // Quitar slash final si tiene
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        
        // La URL del QR es simplemente la URL base (el usuario iniciará sesión allí)
        this.urlQr = baseUrl;

        QRCode.toCanvas(this.qrCanvas.nativeElement, this.urlQr, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, (error) => {
            if (error) console.error(error);
        });
    }

    limpiarCanvas() {
        const context = this.qrCanvas.nativeElement.getContext('2d');
        if (context) context.clearRect(0, 0, 256, 256);
    }

    cerrar() {
        this.modalCtrl.dismiss();
    }
    
    async copiarUrl() {
        try {
            await navigator.clipboard.writeText(this.urlQr);
            const btn = document.querySelector('.url-box ion-button');
            if(btn) {
                const originalColor = btn.getAttribute('color');
                btn.setAttribute('color', 'success');
                setTimeout(() => btn.setAttribute('color', originalColor || 'primary'), 1000);
            }
        } catch (err) {
            console.error('Error al copiar: ', err);
        }
    }
}
