import { Component, OnInit, inject } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ReportesService, ReportMetric, ReportData } from './services/reportes.service';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
  standalone: false
})
export class ReportesComponent implements OnInit {
  private reportesService = inject(ReportesService);

  metrics: ReportMetric[] = [];
  filteredMetrics: ReportMetric[] = [];
  dataLoaded = false;
  
  // KPI Cards
  totalRevenue = 0;
  totalCost = 0;
  totalVolume = 0;
  averageMargin = 0;

  // Filters
  searchTerm = '';
  sortColumn: keyof ReportMetric = 'revenue';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Charts
  public barChartData: ChartData<'bar'> | undefined;
  public pieChartData: ChartData<'pie'> | undefined;
  
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' }
    }
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' }
    }
  };

  Math = Math;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.dataLoaded = false;
    this.reportesService.getGeneralReport().subscribe({
      next: (data: ReportData) => {
        this.metrics = data.metrics;
        this.totalRevenue = data.totalRevenue;
        this.totalCost = data.totalCost;
        this.totalVolume = data.totalVolume;
        
        // Calculate weighted average margin
        this.averageMargin = this.totalRevenue > 0 
          ? ((this.totalRevenue - this.totalCost) / this.totalRevenue) * 100 
          : 0;

        this.applyFilters();
        this.dataLoaded = true;
      },
      error: (err) => console.error('Error loading report data', err)
    });
  }

  applyFilters() {
    let temp = [...this.metrics];
    
    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(m => m.name.toLowerCase().includes(term));
    }

    // Sort
    temp.sort((a, b) => {
      const valA = a[this.sortColumn];
      const valB = b[this.sortColumn];
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      // String sort
      if (typeof valA === 'string' && typeof valB === 'string') {
         return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });

    this.filteredMetrics = temp;
    this.prepareCharts();
  }

  prepareCharts() {
    const labels = this.filteredMetrics.map(m => m.name);
    
    // Bar Chart
    this.barChartData = {
      labels,
      datasets: [
        {
          data: this.filteredMetrics.map(m => m.revenue),
          label: 'Ventas ($)',
          backgroundColor: '#10b981', // green-500
          borderRadius: 4
        },
        {
          data: this.filteredMetrics.map(m => m.cost),
          label: 'Costo ($)',
          backgroundColor: '#ef4444', // red-500
          borderRadius: 4,
          hidden: true
        }
      ]
    };

    // Pie Chart (Top 5 + Others to avoid clutter)
    const top5 = this.filteredMetrics.slice(0, 5);
    const others = this.filteredMetrics.slice(5);
    const otherShare = others.reduce((acc, curr) => acc + curr.share, 0);
    
    const pieLabels = top5.map(m => m.name);
    const pieData = top5.map(m => m.share);
    
    if (others.length > 0) {
      pieLabels.push('Otros');
      pieData.push(otherShare);
    }

    this.pieChartData = {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: [
          '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#9ca3af'
        ]
      }]
    };
  }

  toggleSort(column: keyof ReportMetric) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  exportPDF() {
    this.reportesService.exportToPDF(this.filteredMetrics);
  }

  exportExcel() {
    this.reportesService.exportToExcel(this.filteredMetrics);
  }

  refresh() {
    this.loadData();
  }
}
