import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-cart-item',
    templateUrl: './cart-item.component.html',
    styleUrls: ['./cart-item.component.scss'],
    standalone: false
})
export class CartItemComponent {
    @Input() item: any;
    @Output() remove = new EventEmitter<any>();
    @Output() updateQuantity = new EventEmitter<{ item: any, quantity: number }>();

    constructor() { }

    onRemove() {
        this.remove.emit(this.item);
    }

    increment() {
        this.updateQuantity.emit({ item: this.item, quantity: this.item.quantity + 1 });
    }

    decrement() {
        if (this.item.quantity > 1) {
            this.updateQuantity.emit({ item: this.item, quantity: this.item.quantity - 1 });
        }
    }
}
