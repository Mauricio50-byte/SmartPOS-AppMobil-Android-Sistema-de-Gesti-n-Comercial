import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-payment-selector',
    templateUrl: './payment-selector.component.html',
    styleUrls: ['./payment-selector.component.scss'],
    standalone: false
})
export class PaymentSelectorComponent {
    @Input() selectedMethod: string = 'Efectivo';
    @Output() selectedMethodChange = new EventEmitter<string>();

    constructor() { }

    selectMethod(method: string) {
        this.selectedMethod = method;
        this.selectedMethodChange.emit(method);
    }
}
