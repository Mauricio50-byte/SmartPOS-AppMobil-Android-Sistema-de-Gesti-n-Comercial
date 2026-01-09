
export interface CategoryStat {
  name: string;
  revenue: number;
  percentage: number;
  color: string;
}

export const CHART_COLORS = [
  '#3880ff', // Primary
  '#3dc2ff', // Secondary
  '#5260ff', // Tertiary
  '#2dd36f', // Success
  '#ffc409', // Warning
  '#eb445a', // Danger
  '#92949c', // Medium
  '#f4f5f8'  // Light
];

export function calculateCategoryStats(ventas: any[], productos: any[]): CategoryStat[] {
  const categorySales: Record<string, number> = {};
  const productMap = new Map(productos.map(p => [p.id, p]));
  let totalRevenue = 0;

  ventas.forEach(v => {
    const items = v.items || v.detalles || [];
    items.forEach((item: any) => {
      const pId = item.producto?.id || item.productoId;
      const product = productMap.get(pId);
      if (product) {
        // Use logic to determine category - adjust property names as needed based on actual data
        const cat = product.categoria || (product as any).tipo || 'General';
        // Calculate item total: subtotal or quantity * price
        const itemTotal = Number(item.subtotal) || (Number(item.cantidad) * Number(item.precioUnitario)) || 0;
        
        categorySales[cat] = (categorySales[cat] || 0) + itemTotal;
        totalRevenue += itemTotal;
      }
    });
  });

  return Object.entries(categorySales)
    .map(([name, revenue], index) => ({
      name,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function calculatePaymentMethodStats(ventas: any[]): CategoryStat[] {
  const paymentSales: Record<string, number> = {};
  let totalRevenue = 0;

  ventas.forEach(v => {
    const method = v.metodoPago || 'Desconocido';
    const total = Number(v.total) || 0;
    
    paymentSales[method] = (paymentSales[method] || 0) + total;
    totalRevenue += total;
  });

  return Object.entries(paymentSales)
    .map(([name, revenue], index) => ({
      name,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
