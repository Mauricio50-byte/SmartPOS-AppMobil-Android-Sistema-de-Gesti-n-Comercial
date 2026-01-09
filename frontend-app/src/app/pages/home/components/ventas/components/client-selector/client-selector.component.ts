import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Cliente } from 'src/app/core/models/cliente';

@Component({
    standalone: false,
    selector: 'app-client-selector',
    templateUrl: './client-selector.component.html',
    styleUrls: ['./client-selector.component.scss'],
})
export class ClientSelectorComponent {
    @Input() clientes: Cliente[] = [];
    @Input() clienteSeleccionado: Cliente | null = null;
    @Input() mostrarRegistroCliente: boolean = false;

    @Output() clienteSeleccionadoChange = new EventEmitter<Cliente | null>();
    @Output() nuevoClienteClick = new EventEmitter<void>();

    seleccionarCliente(cliente: Cliente) {
        this.clienteSeleccionadoChange.emit(cliente);
    }

    limpiarCliente() {
        this.clienteSeleccionadoChange.emit(null);
    }

    abrirRegistroCliente() {
        this.nuevoClienteClick.emit();
    }
}
