import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryDistributionComponent } from './category-distribution.component';
import { calculateCategoryStats } from '../../utils/dashboard.utils';

describe('CategoryDistributionComponent', () => {
  let component: CategoryDistributionComponent;
  let fixture: ComponentFixture<CategoryDistributionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CategoryDistributionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryDistributionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate stats correctly', () => {
    const mockProducts = [
      { id: 1, categoria: 'Food', nombre: 'Apple' },
      { id: 2, categoria: 'Tech', nombre: 'Mouse' }
    ];
    const mockSales = [
      { items: [{ productoId: 1, total: 100 }] },
      { items: [{ productoId: 2, total: 200 }] }
    ];

    const stats = calculateCategoryStats(mockSales, mockProducts);
    
    expect(stats.length).toBe(2);
    expect(stats[0].name).toBe('Tech'); // Higher revenue first
    expect(stats[0].revenue).toBe(200);
    expect(stats[1].name).toBe('Food');
    expect(stats[1].revenue).toBe(100);
  });
});
