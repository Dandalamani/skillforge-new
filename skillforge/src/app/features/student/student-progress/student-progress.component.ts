import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface ProgressData {
  totalAttempts: number; avgScore: number | null; passRate: number | null;
  byCourse: { course: string; attempts: number; quizCount: number; avgScore: number; hasAttempts: boolean }[];
  timeline: { quizTitle: string; course: string; score: number; attemptTime: string; attemptNumber: number }[];
}

declare var Chart: any;

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-progress.component.html',
  styleUrl: './student-progress.component.scss',
})
export class StudentProgressComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  @ViewChild('barCanvas')      barCanvas!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas')     lineCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  progress = signal<ProgressData | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  chartsReady = signal(false);

  private barChart: any;
  private lineChart: any;
  private doughnutChart: any;
  private chartJsLoaded = false;
  private dataLoaded = false;
  private viewReady = false;

  ngOnInit(): void {
    this.loadChartJs().then(() => {
      this.chartJsLoaded = true;
      this.tryRenderCharts();
    });
    this.http.get<{ progress: ProgressData }>(`${environment.apiUrl}/student/progress`).subscribe({
      next: r => {
        this.progress.set(r.progress);
        this.isLoading.set(false);
        this.dataLoaded = true;
        this.tryRenderCharts();
      },
      error: () => { this.errorMessage.set('Failed to load progress.'); this.isLoading.set(false); },
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.tryRenderCharts();
  }

  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private tryRenderCharts(): void {
    if (!this.chartJsLoaded || !this.dataLoaded || !this.viewReady) return;
    const p = this.progress();
    if (!p || p.totalAttempts === 0) return;
    setTimeout(() => {
      this.renderBarChart(p);
      this.renderLineChart(p);
      this.renderDoughnutChart(p);
      this.chartsReady.set(true);
    }, 150);
  }

  private renderBarChart(p: ProgressData): void {
    if (!this.barCanvas?.nativeElement) return;
    if (this.barChart) this.barChart.destroy();
    const labels = p.byCourse.map(c => c.course.length > 14 ? c.course.substring(0, 14) + '…' : c.course);
    const scores = p.byCourse.map(c => c.avgScore);
    const colors = p.byCourse.map(c =>
      !c.hasAttempts ? 'rgba(200,200,200,0.5)' :
      c.avgScore >= 80 ? 'rgba(46,125,50,0.8)' :
      c.avgScore >= 60 ? 'rgba(245,200,66,0.85)' :
      'rgba(198,40,40,0.75)'
    );
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Score (%)',
          data: scores,
          backgroundColor: colors,
          borderRadius: 8, borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: (ctx: any) => {
              const c = p.byCourse[ctx.dataIndex];
              return c.hasAttempts ? ` Avg: ${ctx.parsed.y}%` : ' Not attempted yet';
            },
            afterLabel: (ctx: any) => {
              const c = p.byCourse[ctx.dataIndex];
              return c.hasAttempts ? ` Attempts: ${c.attempts}` : '';
            },
          }}
        },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: '#f0ede4' }, ticks: { callback: (v: any) => v + '%', font: { family: 'DM Sans' } } },
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans' } } }
        }
      }
    });
  }

  private renderLineChart(p: ProgressData): void {
    if (!this.lineCanvas?.nativeElement) return;
    if (this.lineChart) this.lineChart.destroy();
    const sorted = [...p.timeline].reverse();
    const labels = sorted.map(t => new Date(t.attemptTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const scores = sorted.map(t => t.score);
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Score (%)', data: scores,
          borderColor: '#f5c842', backgroundColor: 'rgba(245,200,66,0.1)',
          pointBackgroundColor: scores.map(s => s >= 80 ? '#2e7d32' : s >= 60 ? '#f5c842' : '#c62828'),
          pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6,
          tension: 0.4, fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: (ctx: any) => ` Score: ${ctx.parsed.y}%`,
            title: (items: any) => {
              const t = sorted[items[0].dataIndex];
              return t ? `${t.quizTitle}${t.attemptNumber > 1 ? ` (Attempt #${t.attemptNumber})` : ''}` : '';
            }
          }}
        },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: '#f0ede4' }, ticks: { callback: (v: any) => v + '%', font: { family: 'DM Sans' } } },
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } }
        }
      }
    });
  }

  private renderDoughnutChart(p: ProgressData): void {
    if (!this.doughnutCanvas?.nativeElement) return;
    if (this.doughnutChart) this.doughnutChart.destroy();
    const passed = p.timeline.filter(t => t.score >= 60).length;
    const failed = p.timeline.filter(t => t.score < 60).length;
    this.doughnutChart = new Chart(this.doughnutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed'],
        datasets: [{ data: [passed, failed], backgroundColor: ['rgba(46,125,50,0.85)', 'rgba(198,40,40,0.75)'], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 12 }, padding: 16, usePointStyle: true } },
          tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed}` } }
        }
      }
    });
  }

  getScoreClass(s: number): string { if (s >= 80) return 'high'; if (s >= 60) return 'mid'; return 'low'; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}