import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface ProgressData { totalAttempts: number; avgScore: number | null; passRate: number | null; byCourse: { course: string; attempts: number; quizCount: number; avgScore: number }[]; timeline: { quizTitle: string; course: string; score: number; attemptTime: string }[]; }

@Component({ selector: 'app-student-progress', standalone: true, imports: [CommonModule], templateUrl: './student-progress.component.html', styleUrl: './student-progress.component.scss' })
export class StudentProgressComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);
  progress = signal<ProgressData | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.http.get<{ progress: ProgressData }>(`${environment.apiUrl}/student/progress`).subscribe({
      next: (res) => { this.progress.set(res.progress); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load progress.'); this.isLoading.set(false); },
    });
  }
  getScoreClass(s: number | null): string { if (!s) return ''; if (s >= 80) return 'high'; if (s >= 60) return 'mid'; return 'low'; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}