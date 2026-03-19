import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface DashData {
  totalUsers: number; totalStudents: number; totalInstructors: number;
  totalCourses: number; publishedCourses: number;
  totalQuizzes: number; aiQuizzes: number; totalAttempts: number;
  recentUsers: { id: number; name: string; email: string; role: string; createdAt: string }[];
}

@Component({ selector: 'app-admin-dashboard', standalone: true, imports: [CommonModule, ConfirmDialogComponent], templateUrl: './admin-dashboard.component.html', styleUrl: './admin-dashboard.component.scss' })
export class AdminDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  user = this.authService.currentUser;
  data = signal<DashData | null>(null);
  isLoading = signal(true);

  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingUserId = signal<number | null>(null);

  ngOnInit(): void {
    this.http.get<{ dashboard: DashData }>(`${environment.apiUrl}/admin/dashboard`).subscribe({
      next: (res) => { this.data.set(res.dashboard); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  confirmDelete(user: { id: number; name: string }): void {
    this.pendingUserId.set(user.id);
    this.dialogTitle.set('Remove User');
    this.dialogMessage.set(`"${user.name}" will be permanently removed from the platform.`);
    this.showDialog.set(true);
  }

  onDeleteConfirmed(): void {
    const id = this.pendingUserId();
    this.showDialog.set(false);
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${id}`).subscribe({
      next: () => this.data.update(d => d ? { ...d, recentUsers: d.recentUsers.filter(u => u.id !== id), totalUsers: d.totalUsers - 1 } : d),
    });
    this.pendingUserId.set(null);
  }

  getInitial(name: string): string { return name?.[0]?.toUpperCase() ?? '?'; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}