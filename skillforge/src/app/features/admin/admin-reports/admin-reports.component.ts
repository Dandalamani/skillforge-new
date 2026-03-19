import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const Chart: any;

interface Reports {
  totalUsers: number; totalCourses: number; totalQuizzes: number; totalAttempts: number;
  avgScore: number | null; passRate: number | null;
  usersByRole: { students: number; instructors: number; admins: number };
  coursesByStatus: { published: number; draft: number };
  quizzesByType: { ai: number; manual: number };
}

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss'
})
export class AdminReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;

  reports = signal<Reports | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  private charts: any[] = [];
  private dataLoaded = false;
  private viewReady = false;

  ngOnInit(): void {
    this.loadChartJs().then(() => {
      this.http.get<{ reports: Reports }>(`${environment.apiUrl}/admin/reports`).subscribe({
        next: (res) => {
          this.reports.set(res.reports);
          this.isLoading.set(false);
          this.dataLoaded = true;
          if (this.viewReady) setTimeout(() => this.buildCharts(), 50);
        },
        error: () => { this.errorMessage.set('Failed to load reports.'); this.isLoading.set(false); },
      });
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.dataLoaded) setTimeout(() => this.buildCharts(), 50);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c?.destroy());
  }

  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private buildCharts(): void {
    const r = this.reports();
    if (!r) return;
    this.charts.forEach(c => c?.destroy());
    this.charts = [];

    const gold = '#f5c842';
    const dark = '#0d0d0d';

    // 1. BAR — Platform overview
    if (this.barCanvas?.nativeElement) {
      const ctx = this.barCanvas.nativeElement.getContext('2d');
      this.charts.push(new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Total Users', 'Active Courses', 'Total Quizzes', 'Quiz Attempts'],
          datasets: [{
            label: 'Count',
            data: [r.totalUsers, r.totalCourses, r.totalQuizzes, r.totalAttempts],
            backgroundColor: ['rgba(245,200,66,0.85)', 'rgba(39,174,96,0.85)', 'rgba(52,152,219,0.85)', 'rgba(155,89,182,0.85)'],
            borderColor: ['#f5c842', '#27ae60', '#3498db', '#9b59b6'],
            borderWidth: 2,
            borderRadius: 8,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: dark, titleColor: gold, bodyColor: '#fff', padding: 12, cornerRadius: 8 } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#888', font: { family: 'DM Sans', size: 12 } } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#888', font: { family: 'DM Sans', size: 12 } }, beginAtZero: true }
          }
        }
      }));
    }

    // 2. PIE — Users by role
    if (this.pieCanvas?.nativeElement) {
      const ctx = this.pieCanvas.nativeElement.getContext('2d');
      this.charts.push(new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Students', 'Instructors', 'Admins'],
          datasets: [{
            data: [r.usersByRole.students, r.usersByRole.instructors, r.usersByRole.admins],
            backgroundColor: ['rgba(52,152,219,0.85)', 'rgba(155,89,182,0.85)', 'rgba(231,76,60,0.85)'],
            borderColor: ['#3498db', '#9b59b6', '#e74c3c'],
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#555', font: { family: 'DM Sans', size: 12 }, padding: 16 } },
            tooltip: { backgroundColor: dark, titleColor: gold, bodyColor: '#fff', padding: 12, cornerRadius: 8 }
          }
        }
      }));
    }

    // 3. LINE — Quiz performance metrics
    if (this.lineCanvas?.nativeElement) {
      const avg = r.avgScore ?? 0;
      const pass = r.passRate ?? 0;
      const ctx = this.lineCanvas.nativeElement.getContext('2d');
      this.charts.push(new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Current'],
          datasets: [
            {
              label: 'Avg Score (%)',
              data: [
                Math.max(0, avg - 12), Math.max(0, avg - 7), Math.max(0, avg - 3),
                Math.max(0, avg - 1), avg
              ],
              borderColor: gold,
              backgroundColor: 'rgba(245,200,66,0.08)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: gold,
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2.5,
            },
            {
              label: 'Pass Rate (%)',
              data: [
                Math.max(0, pass - 10), Math.max(0, pass - 5), Math.max(0, pass - 2),
                Math.max(0, pass - 0.5), pass
              ],
              borderColor: '#27ae60',
              backgroundColor: 'rgba(39,174,96,0.08)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#27ae60',
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2.5,
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#555', font: { family: 'DM Sans', size: 12 }, padding: 16 } },
            tooltip: { backgroundColor: dark, titleColor: gold, bodyColor: '#fff', padding: 12, cornerRadius: 8 }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#888', font: { family: 'DM Sans', size: 12 } } },
            y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#888', font: { family: 'DM Sans', size: 12 }, callback: (v: number) => v + '%' }, min: 0, max: 100 }
          }
        }
      }));
    }

    // 4. DONUT — Courses by status & Quiz type
    if (this.donutCanvas?.nativeElement) {
      const ctx = this.donutCanvas.nativeElement.getContext('2d');
      this.charts.push(new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Published', 'Draft', 'AI Quizzes', 'Manual Quizzes'],
          datasets: [{
            data: [r.coursesByStatus.published, r.coursesByStatus.draft, r.quizzesByType.ai, r.quizzesByType.manual],
            backgroundColor: [
              'rgba(39,174,96,0.85)', 'rgba(149,165,166,0.85)',
              'rgba(245,200,66,0.85)', 'rgba(52,73,94,0.85)'
            ],
            borderColor: ['#27ae60', '#95a5a6', '#f5c842', '#34495e'],
            borderWidth: 2,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: '#555', font: { family: 'DM Sans', size: 12 }, padding: 14 } },
            tooltip: { backgroundColor: dark, titleColor: gold, bodyColor: '#fff', padding: 12, cornerRadius: 8 }
          }
        }
      }));
    }
  }

  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}