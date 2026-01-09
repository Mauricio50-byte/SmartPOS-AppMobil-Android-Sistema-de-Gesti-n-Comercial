import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-product-card',
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.scss'],
    standalone: false
})
export class ProductCardComponent {
    @Input() product: any;
    @Output() add = new EventEmitter<any>();

    constructor() { }

    onAdd() {
        this.add.emit(this.product);
    }
}
