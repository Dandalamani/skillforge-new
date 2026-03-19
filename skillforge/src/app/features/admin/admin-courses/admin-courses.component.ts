import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface AdminCourse { id: number; title: string; description: string; status: string; difficulty: string; instructor: string; quizCount: number; createdAt: string; }
type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

@Component({ selector: 'app-admin-courses', standalone: true, imports: [CommonModule, ConfirmDialogComponent], templateUrl: './admin-courses.component.html', styleUrl: './admin-courses.component.scss' })
export class AdminCoursesComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  courses = signal<AdminCourse[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  filterStatus = signal<StatusFilter>('ALL');

  readonly statusFilters: StatusFilter[] = ['ALL', 'PUBLISHED', 'DRAFT'];

  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingId = signal<number | null>(null);

  get filtered() {
    const s = this.filterStatus();
    return s === 'ALL' ? this.courses() : this.courses().filter(c => c.status === s);
  }

  ngOnInit(): void {
    this.http.get<{ courses: AdminCourse[] }>(`${environment.apiUrl}/admin/courses`).subscribe({
      next: (res) => { this.courses.set(res.courses); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load courses.'); this.isLoading.set(false); },
    });
  }

  setFilter(s: StatusFilter): void { this.filterStatus.set(s); }

  confirmDelete(course: AdminCourse): void {
    this.pendingId.set(course.id);
    this.dialogTitle.set('Delete Course');
    this.dialogMessage.set(`"${course.title}" and all its quizzes will be permanently deleted.`);
    this.showDialog.set(true);
  }

  onDeleteConfirmed(): void {
    const id = this.pendingId();
    this.showDialog.set(false);
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/admin/courses/${id}`).subscribe({
      next: () => this.courses.update(list => list.filter(c => c.id !== id)),
    });
    this.pendingId.set(null);
  }

  closeDialog(): void { this.showDialog.set(false); }
  getDiffClass(d: string): string { return d?.toLowerCase() ?? ''; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}