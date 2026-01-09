import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, map } from 'rxjs';
import { VentaServices } from '../../../../../core/services/venta.service';
import { ProductosServices } from '../../../../../core/services/producto.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ReportMetric {
  name: string;
  salesVolume: number; // Units
  revenue: number; // Money
  cost: number; // Money
  margin: number; // %
  growth: number; // % vs previous period
  share: number; // % of total revenue
}

export interface ReportData {
  metrics: ReportMetric[];
  totalRevenue: number;
  totalCost: number;
  totalVolume: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private ventaService = inject(VentaServices);
  private productoService = inject(ProductosServices);

  constructor() {}

  getGeneralReport(): Observable<ReportData> {
    return forkJoin({
      ventas: this.ventaService.listarVentas(),
      productos: this.productoService.listarProductos()
    }).pipe(
      map(({ ventas, productos }) => this.calculateMetrics(ventas, productos))
    );
  }

  private calculateMetrics(ventas: any[], productos: any[]): ReportData {
    const productMap = new Map(productos.map(p => [p.id, p]));
    const categoryStats: Record<string, { 
      volume: number, 
      revenue: number, 
      cost: number, 
      prevRevenue: number 
    }> = {};

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalVolume = 0;

    ventas.forEach(v => {
      const vDate = new Date(v.fecha);
      const isCurrentPeriod = vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;
      const isPrevPeriod = vDate.getMonth() === prevMonth && vDate.getFullYear() === prevYear;

      if (!isCurrentPeriod && !isPrevPeriod) return;

      const items = v.items || v.detalles || [];
      items.forEach((item: any) => {
        const pId = item.producto?.id || item.productoId;
        const product = productMap.get(pId);
        if (!product) return;

        const cat = product.categoria || product.tipo || 'General';
        const qty = item.cantidad || 1;
        // Prioritize subtotal, then calculated total, then explicit total
        const itemRevenue = Number(item.subtotal) || (Number(item.precioUnitario) * qty) || Number(item.total) || 0;
        const unitCost = product.precioCosto || 0;
        const itemCost = unitCost * qty;

        if (!categoryStats[cat]) {
          categoryStats[cat] = { volume: 0, revenue: 0, cost: 0, prevRevenue: 0 };
        }

        if (isCurrentPeriod) {
          categoryStats[cat].volume += qty;
          categoryStats[cat].revenue += itemRevenue;
          categoryStats[cat].cost += itemCost;
          totalRevenue += itemRevenue;
          totalCost += itemCost;
          totalVolume += qty;
        } else if (isPrevPeriod) {
          categoryStats[cat].prevRevenue += itemRevenue;
        }
      });
    });

    const metrics = Object.entries(categoryStats).map(([name, stats]) => {
      const margin = stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0;
      const growth = stats.prevRevenue > 0 ? ((stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100 : 0;
      const share = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;

      return {
        name,
        salesVolume: stats.volume,
        revenue: stats.revenue,
        cost: stats.cost,
        margin,
        growth,
        share
      };
    });

    return { metrics, totalRevenue, totalCost, totalVolume };
  }

  exportToPDF(data: ReportMetric[], title: string = 'Reporte de Categorías') {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generado el: ${date}`, 14, 30);

    const headers = [['Categoría', 'Ventas ($)', 'Costo ($)', 'Margen (%)', 'Crecimiento (%)', 'Volumen']];
    const rows = data.map(row => [
      row.name,
      row.revenue.toFixed(2),
      row.cost.toFixed(2),
      row.margin.toFixed(2) + '%',
      row.growth.toFixed(2) + '%',
      row.salesVolume
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] } // green-600
    });

    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
  }

  exportToExcel(data: ReportMetric[], fileName: string = 'reporte') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, fileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }
}
