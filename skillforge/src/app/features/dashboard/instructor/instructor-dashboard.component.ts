import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../shared/models/course.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InstructorProfileComponent } from '../../instructor/instructor-profile/instructor-profile.component';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, InstructorProfileComponent],
  templateUrl: './instructor-dashboard.component.html',
  styleUrl: './instructor-dashboard.component.scss',
})
export class InstructorDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private router = inject(Router);
  private courseService = inject(CourseService);

  user = this.authService.currentUser;
  courses = signal<Course[]>([]);
  isLoading = signal(true);
  showProfile = signal(false);
  showProfileDrawer = signal(false);

  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingDeleteCourse = signal<Course | null>(null);

  totalCourses    = computed(() => this.courses().length);
  publishedCourses = computed(() => this.courses().filter(c => c.status === 'PUBLISHED').length);
  draftCourses    = computed(() => this.courses().filter(c => c.status === 'DRAFT').length);

  get firstName(): string { return this.user()?.name?.split(' ')[0] ?? ''; }
  get initials(): string {
    return (this.user()?.name ?? '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  private clickOutside = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!t.closest('.profile-dropdown') && !t.closest('.avatar-btn')) {
      this.showProfile.set(false);
    }
  };

  ngOnInit(): void {
    this.loadCourses();
    document.addEventListener('click', this.clickOutside);
  }

  ngOnDestroy(): void { document.removeEventListener('click', this.clickOutside); }

  loadCourses(): void {
    this.isLoading.set(true);
    this.courseService.getAll().subscribe({
      next: c => { this.courses.set(c); this.isLoading.set(false); },
      error: () => this.isLoading.set(false),
    });
  }

  toggleProfile(): void { this.showProfile.update(v => !v); }
  openProfileDrawer(): void { this.showProfile.set(false); this.showProfileDrawer.set(true); }

  confirmDelete(course: Course): void {
    this.pendingDeleteCourse.set(course);
    this.dialogTitle.set('Delete Course');
    this.dialogMessage.set(`"${course.title}" will be permanently deleted.`);
    this.showDialog.set(true);
  }

  onDeleteConfirmed(): void {
    const course = this.pendingDeleteCourse();
    if (!course) return;
    this.showDialog.set(false);
    this.courseService.delete(course.id).subscribe({
      next: () => this.courses.update(list => list.filter(c => c.id !== course.id)),
    });
    this.pendingDeleteCourse.set(null);
  }

  onDeleteCancelled(): void { this.showDialog.set(false); this.pendingDeleteCourse.set(null); }
  editCourse(id: number): void { this.router.navigate(['/courses', id, 'edit']); }
  navigate(path: string): void { this.showProfile.set(false); this.router.navigate([path]); }
  getDifficultyClass(level: string): string { return level?.toLowerCase() ?? ''; }
  logout(): void { this.authService.logout(); }
}