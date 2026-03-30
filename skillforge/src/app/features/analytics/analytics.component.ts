import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface CourseStats {
  courseId: number; title: string; quizCount: number;
  attempts: number; avgScore: number | null; passRate: number | null;
}
interface AnalyticsData {
  totalCourses: number; publishedCourses: number; totalQuizzes: number;
  totalAttempts: number; totalStudents: number;
  overallAvgScore: number | null; overallPassRate: number | null;
  courseStats: CourseStats[];
}

declare var Chart: any;

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  @ViewChild('barCanvas')      barCanvas!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('passRateCanvas') passRateCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  analytics    = signal<AnalyticsData | null>(null);
  isLoading    = signal(true);
  errorMessage = signal('');

  private barChart: any; private passRateChart: any; private doughnutChart: any;
  private chartJsLoaded = false; private dataLoaded = false; private viewReady = false;

  ngOnInit(): void {
    this.loadChartJs().then(() => { this.chartJsLoaded = true; this.tryRender(); });
    this.http.get<{ analytics: AnalyticsData }>(`${environment.apiUrl}/users/instructor/analytics`).subscribe({
      next: r => { this.analytics.set(r.analytics); this.isLoading.set(false); this.dataLoaded = true; this.tryRender(); },
      error: () => { this.errorMessage.set('Failed to load analytics.'); this.isLoading.set(false); },
    });
  }

  ngAfterViewInit(): void { this.viewReady = true; this.tryRender(); }

  private loadChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private tryRender(): void {
    if (!this.chartJsLoaded || !this.dataLoaded || !this.viewReady) return;
    const a = this.analytics();
    if (!a) return;
    setTimeout(() => { this.renderBar(a); this.renderPassRate(a); this.renderDoughnut(a); }, 150);
  }

  private renderBar(a: AnalyticsData): void {
    if (!this.barCanvas?.nativeElement) return;
    if (this.barChart) this.barChart.destroy();
    const labels    = a.courseStats.map(c => c.title.length > 14 ? c.title.substring(0,14)+'…' : c.title);
    const avgScores = a.courseStats.map(c => c.avgScore ?? 0);
    const attempts  = a.courseStats.map(c => c.attempts);
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Avg Score (%)', data: avgScores, yAxisID: 'y',
          backgroundColor: avgScores.map(s => s >= 80 ? 'rgba(46,125,50,0.8)' : s >= 60 ? 'rgba(245,200,66,0.85)' : s > 0 ? 'rgba(198,40,40,0.75)' : 'rgba(200,200,200,0.35)'),
          borderRadius: 8, borderSkipped: false },
        { label: 'Attempts', data: attempts, yAxisID: 'y2', type: 'line',
          borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.08)',
          pointBackgroundColor: '#1a73e8', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5,
          tension: 0.4, fill: false }
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { family:'DM Sans', size:12 }, usePointStyle:true, padding:16 } },
          tooltip: { callbacks: { label: (ctx: any) => ctx.dataset.label === 'Avg Score (%)' ? ` Avg: ${ctx.parsed.y}%` : ` Attempts: ${ctx.parsed.y}` } }
        },
        scales: {
          y:  { beginAtZero:true, max:100, position:'left',  grid:{color:'#f0ede4'}, ticks:{callback:(v:any)=>v+'%', font:{family:'DM Sans'}} },
          y2: { beginAtZero:true, position:'right', grid:{display:false}, ticks:{font:{family:'DM Sans'}, stepSize:1} },
          x:  { grid:{display:false}, ticks:{font:{family:'DM Sans'}} }
        }
      }
    });
  }

  private renderPassRate(a: AnalyticsData): void {
    if (!this.passRateCanvas?.nativeElement) return;
    if (this.passRateChart) this.passRateChart.destroy();
    const labels    = a.courseStats.map(c => c.title.length > 14 ? c.title.substring(0,14)+'…' : c.title);
    const passRates = a.courseStats.map(c => c.passRate ?? 0);
    this.passRateChart = new Chart(this.passRateCanvas.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Pass Rate (%)', data: passRates,
        backgroundColor: passRates.map(r => r >= 80 ? 'rgba(46,125,50,0.8)' : r >= 60 ? 'rgba(26,115,232,0.75)' : r > 0 ? 'rgba(198,40,40,0.75)' : 'rgba(200,200,200,0.35)'),
        borderRadius: 8, borderSkipped: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:(ctx:any)=>` Pass Rate: ${ctx.parsed.y}%`}} },
        scales: {
          x: { grid:{display:false}, ticks:{font:{family:'DM Sans'}} },
          y: { beginAtZero:true, max:100, grid:{color:'#f0ede4'}, ticks:{callback:(v:any)=>v+'%', font:{family:'DM Sans'}} }
        }
      }
    });
  }

  private renderDoughnut(a: AnalyticsData): void {
    if (!this.doughnutCanvas?.nativeElement) return;
    if (this.doughnutChart) this.doughnutChart.destroy();
    this.doughnutChart = new Chart(this.doughnutCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Published', 'Drafts'],
        datasets: [{ data: [a.publishedCourses, a.totalCourses - a.publishedCourses],
          backgroundColor: ['rgba(46,125,50,0.85)', 'rgba(245,200,66,0.85)'], borderWidth:0, hoverOffset:6 }]
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'70%',
        plugins: { legend:{ position:'bottom', labels:{font:{family:'DM Sans',size:12}, padding:16, usePointStyle:true} },
          tooltip:{callbacks:{label:(ctx:any)=>` ${ctx.label}: ${ctx.parsed}`}} }
      }
    });
  }

  getPassRateHeight(): number { return Math.max(180, (this.analytics()?.courseStats.length ?? 1) * 60); }
  getScoreClass(score: number | null): string {
    if (score === null) return 'none';
    if (score >= 80) return 'high'; if (score >= 60) return 'mid'; return 'low';
  }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}