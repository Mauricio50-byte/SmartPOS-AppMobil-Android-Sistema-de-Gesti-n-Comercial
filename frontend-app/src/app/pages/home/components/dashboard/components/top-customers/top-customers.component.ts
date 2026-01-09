import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

interface CustomerStat {
  name: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: Date;
}

@Component({
  selector: 'app-top-customers',
  templateUrl: './top-customers.component.html',
  styleUrls: ['./top-customers.component.scss'],
  standalone: false
})
export class TopCustomersComponent implements OnChanges {
  @Input() ventas: any[] = [];
  @Input() clientes: any[] = [];

  topCustomers: CustomerStat[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventas'] || changes['clientes']) {
      this.processData();
    }
  }

  private processData() {
    if (!this.ventas || !this.clientes) return;

    const customerMap: Record<number, CustomerStat> = {};
    const clientsById = new Map(this.clientes.map(c => [c.id, c]));

    this.ventas.forEach(v => {
      if (v.clienteId) {
        const cId = v.clienteId;
        const total = Number(v.total) || 0;
        const date = new Date(v.fecha);

        if (!customerMap[cId]) {
          const client = clientsById.get(cId);
          customerMap[cId] = {
            name: client ? client.nombre : `Cliente #${cId}`,
            totalSpent: 0,
            transactionCount: 0,
            lastPurchase: date
          };
        }

        customerMap[cId].totalSpent += total;
        customerMap[cId].transactionCount += 1;
        if (date > customerMap[cId].lastPurchase) {
          customerMap[cId].lastPurchase = date;
        }
      }
    });

    this.topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }
}
