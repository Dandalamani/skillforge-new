import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface CourseStats {
  courseId: number;
  title: string;
  quizCount: number;
  attempts: number;
  avgScore: number | null;
  passRate: number | null;
}

interface AnalyticsData {
  totalCourses: number;
  publishedCourses: number;
  totalQuizzes: number;
  totalAttempts: number;
  totalStudents: number;
  overallAvgScore: number | null;
  overallPassRate: number | null;
  courseStats: CourseStats[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  analytics = signal<AnalyticsData | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.http.get<{ analytics: AnalyticsData }>(`${environment.apiUrl}/users/instructor/analytics`)
      .subscribe({
        next: (res) => { this.analytics.set(res.analytics); this.isLoading.set(false); },
        error: () => { this.errorMessage.set('Failed to load analytics.'); this.isLoading.set(false); },
      });
  }

  getScoreClass(score: number | null): string {
    if (score === null) return 'none';
    if (score >= 80) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
  }

  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}