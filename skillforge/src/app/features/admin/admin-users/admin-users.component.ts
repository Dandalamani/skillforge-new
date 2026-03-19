import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface AdminUser { id: number; name: string; email: string; role: string; attempts: number | null; createdAt: string; }
type RoleFilter = 'ALL' | 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

@Component({ selector: 'app-admin-users', standalone: true, imports: [CommonModule, ConfirmDialogComponent], templateUrl: './admin-users.component.html', styleUrl: './admin-users.component.scss' })
export class AdminUsersComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  users = signal<AdminUser[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  filterRole = signal<RoleFilter>('ALL');

  readonly roleFilters: RoleFilter[] = ['ALL', 'STUDENT', 'INSTRUCTOR', 'ADMIN'];

  get filtered() {
    const r = this.filterRole();
    return r === 'ALL' ? this.users() : this.users().filter(u => u.role === r);
  }

  ngOnInit(): void {
    this.http.get<{ users: AdminUser[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res) => { this.users.set(res.users); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load users.'); this.isLoading.set(false); },
    });
  }

  setFilter(r: RoleFilter): void { this.filterRole.set(r); }

  confirmDelete(user: AdminUser): void {
    this.pendingId.set(user.id);
    this.dialogTitle.set('Remove User');
    this.dialogMessage.set(`"${user.name}" will be permanently removed from the platform.`);
    this.showDialog.set(true);
  }

  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingId = signal<number | null>(null);

  onDeleteConfirmed(): void {
    const id = this.pendingId();
    this.showDialog.set(false);
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${id}`).subscribe({
      next: () => this.users.update(list => list.filter(u => u.id !== id)),
      error: () => this.errorMessage.set('Failed to delete user.'),
    });
    this.pendingId.set(null);
  }

  closeDialog(): void { this.showDialog.set(false); }
  getInitial(name: string): string { return name?.[0]?.toUpperCase() ?? '?'; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}