import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { environment } from '../../../environments/environment';

interface FeedbackItem {
  id: number; quiz_id: number; student_id: number;
  rating: number; comment: string;
  quiz_title: string; course_title: string; student_name: string;
  createdAt: string;
}

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  authService = inject(AuthService);

  feedbacks = signal<FeedbackItem[]>([]);
  isLoading = signal(true);
  avgRating = signal<number | null>(null);
  total = signal(0);
  filterRating = signal<number | 'all'>('all');

  Math = Math;

  get filtered(): FeedbackItem[] {
    const r = this.filterRating();
    return r === 'all' ? this.feedbacks() : this.feedbacks().filter(f => f.rating === r);
  }

  get ratingCounts(): Record<number, number> {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of this.feedbacks()) counts[f.rating] = (counts[f.rating] || 0) + 1;
    return counts;
  }

  ngOnInit(): void {
    this.http.get<{ feedbacks: FeedbackItem[]; avgRating: number; total: number }>(`${environment.apiUrl}/feedback`).subscribe({
      next: r => { this.feedbacks.set(r.feedbacks); this.avgRating.set(r.avgRating); this.total.set(r.total); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  stars(n: number): number[] { return Array(n).fill(0); }
  emptyStars(n: number): number[] { return Array(5 - n).fill(0); }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}