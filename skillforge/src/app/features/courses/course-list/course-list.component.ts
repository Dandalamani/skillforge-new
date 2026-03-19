import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { Course } from '../../../shared/models/course.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);
  private router = inject(Router);
  authService = inject(AuthService);

  courses = signal<Course[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  toastMessage = signal('');

  // Confirm dialog state
  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  dialogType = signal<'danger' | 'warning' | 'info'>('danger');
  dialogConfirmLabel = signal('Confirm');
  pendingAction = signal<(() => void) | null>(null);

  ngOnInit(): void { this.loadCourses(); }

  loadCourses(): void {
    this.isLoading.set(true);
    this.courseService.getAll().subscribe({
      next: (courses) => { this.courses.set(courses); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load courses.'); this.isLoading.set(false); },
    });
  }

  openDialog(opts: { title: string; message: string; type?: 'danger'|'warning'|'info'; confirmLabel?: string; action: () => void }): void {
    this.dialogTitle.set(opts.title);
    this.dialogMessage.set(opts.message);
    this.dialogType.set(opts.type ?? 'danger');
    this.dialogConfirmLabel.set(opts.confirmLabel ?? 'Confirm');
    this.pendingAction.set(opts.action);
    this.showDialog.set(true);
  }

  onDialogConfirmed(): void {
    const action = this.pendingAction();
    this.showDialog.set(false);
    this.pendingAction.set(null);
    if (action) action();
  }

  onDialogCancelled(): void {
    this.showDialog.set(false);
    this.pendingAction.set(null);
  }

  navigate(path: string): void { this.router.navigate([path]); }
  createCourse(): void { this.router.navigate(['/courses/new']); }
  editCourse(id: number): void { this.router.navigate(['/courses', id, 'edit']); }

  toggleStatus(course: Course): void {
    const isPublished = course.status === 'PUBLISHED';
    this.openDialog({
      title: isPublished ? 'Unpublish Course' : 'Publish Course',
      message: isPublished
        ? `"${course.title}" will be hidden from students.`
        : `"${course.title}" will be visible to all students.`,
      type: isPublished ? 'warning' : 'info',
      confirmLabel: isPublished ? 'Yes, Unpublish' : 'Yes, Publish',
      action: () => {
        const req = isPublished ? this.courseService.unpublish(course.id) : this.courseService.publish(course.id);
        req.subscribe({
          next: (updated) => {
            this.courses.update(list => list.map(c => c.id === updated.id ? updated : c));
            this.showToast(`Course ${updated.status === 'PUBLISHED' ? 'published' : 'unpublished'}.`);
          },
          error: () => this.showToast('Failed to update status.'),
        });
      },
    });
  }

  confirmDelete(course: Course): void {
    this.openDialog({
      title: 'Delete Course',
      message: `"${course.title}" will be permanently deleted. This cannot be undone.`,
      type: 'danger',
      confirmLabel: 'Yes, Delete',
      action: () => {
        this.courseService.delete(course.id).subscribe({
          next: () => { this.courses.update(list => list.filter(c => c.id !== course.id)); this.showToast('Course deleted.'); },
          error: () => this.showToast('Failed to delete course.'),
        });
      },
    });
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(''), 3000);
  }

  getDifficultyClass(level: string): string { return level?.toLowerCase() ?? ''; }
  logout(): void { this.authService.logout(); }
}