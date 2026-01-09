import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { calculatePaymentMethodStats, CategoryStat } from '../../utils/dashboard.utils';

@Component({
  selector: 'app-payment-distribution',
  templateUrl: './payment-distribution.component.html',
  styleUrls: ['./payment-distribution.component.scss'],
  standalone: false
})
export class PaymentDistributionComponent implements OnChanges {
  @Input() ventas: any[] = [];

  stats: CategoryStat[] = [];

  // Chart Config
  public chartType: ChartType = 'doughnut';
  public chartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };
  
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    // @ts-ignore
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw as number;
            const total = context.chart.data.datasets[0].data.reduce((a: any, b: any) => a + b, 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${label}: $${value} (${percentage}%)`;
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ventas']) {
      this.processData();
    }
  }

  private processData() {
    if (!this.ventas) return;

    this.stats = calculatePaymentMethodStats(this.ventas);
    this.updateChart();
  }

  private updateChart() {
    this.chartData = {
      labels: this.stats.map(s => s.name),
      datasets: [{
        data: this.stats.map(s => s.revenue),
        backgroundColor: this.stats.map(s => s.color),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }
}
