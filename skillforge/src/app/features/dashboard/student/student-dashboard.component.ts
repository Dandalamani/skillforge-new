import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { StudentProfileComponent } from '../../student/student-profile/student-profile.component';
import { environment } from '../../../../environments/environment';

interface DashboardData {
  totalCourses: number; totalAttempts: number; avgScore: number | null;
  upcomingQuizzes: { id: number; title: string; course: string; difficulty: string; timeLimit: number }[];
  recentCourses: { id: number; title: string; difficulty: string; quizCount: number }[];
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, StudentProfileComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  user = this.authService.currentUser;
  isLoading = signal(true);
  dashboard = signal<DashboardData | null>(null);
  showProfile = signal(false);
  showProfileDrawer = signal(false);

  firstName = computed(() => this.user()?.name?.split(' ')[0] ?? '');
  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });
  memberSince = computed(() => {
    const u = this.user() as any;
    if (!u?.createdAt) return 'N/A';
    return new Date(u.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  private clickOutside = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest('.profile-dropdown') && !t.closest('.avatar-circle')) {
      this.showProfile.set(false);
    }
  };

  ngOnInit(): void {
    this.http.get<{ dashboard: DashboardData }>(`${environment.apiUrl}/student/dashboard`).subscribe({
      next: r => { this.dashboard.set(r.dashboard); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
    document.addEventListener('click', this.clickOutside);
  }

  ngOnDestroy(): void { document.removeEventListener('click', this.clickOutside); }

  toggleProfile(): void { this.showProfile.update(v => !v); }

  openProfileDrawer(): void {
    this.showProfile.set(false);
    this.showProfileDrawer.set(true);
  }

  getDifficultyClass(d: string): string { return d?.toLowerCase() ?? ''; }
  navigate(path: string): void { this.showProfile.set(false); this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}