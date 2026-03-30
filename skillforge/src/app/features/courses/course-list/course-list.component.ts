import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { Course } from '../../../shared/models/course.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface Question { id: number; question_text: string; options: string[]; correct_answer: string; explanation: string; }
interface Quiz { id: number; title: string; description: string; status: string; difficulty_level: string; time_limit_minutes: number; generated_by_ai: boolean; createdAt: string; questions: Question[]; }

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss',
})
export class CourseListComponent implements OnInit {
  private courseService = inject(CourseService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  courses = signal<Course[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  toastMessage = signal('');

  // Quiz panel
  quizPanelCourse = signal<Course | null>(null);
  quizzes = signal<Quiz[]>([]);
  isLoadingQuizzes = signal(false);
  editingQuiz = signal<Quiz | null>(null);
  isSavingQuiz = signal(false);
  quizSaveMsg = signal('');
  quizSaveErr = signal('');
  isPublishingId = signal<number | null>(null);
  isDeletingId = signal<number | null>(null);
  editForm!: FormGroup;
  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  // Confirm dialog
  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  dialogType = signal<'danger'|'warning'|'info'>('danger');
  dialogConfirmLabel = signal('Confirm');
  pendingAction = signal<(() => void) | null>(null);

  ngOnInit(): void { this.loadCourses(); }

  loadCourses(): void {
    this.isLoading.set(true);
    this.courseService.getAll().subscribe({
      next: c => { this.courses.set(c); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load courses.'); this.isLoading.set(false); },
    });
  }

  // ── Quiz Panel ──────────────────────────────────────────
  openQuizPanel(course: Course): void {
    this.quizPanelCourse.set(course);
    this.editingQuiz.set(null);
    this.quizzes.set([]);
    this.isLoadingQuizzes.set(true);
    this.http.get<any>(`${environment.apiUrl}/quizzes?course_id=${course.id}`).subscribe({
      next: r => {
        const all: Quiz[] = r.quizzes ?? r ?? [];
        this.quizzes.set(all.filter((q: any) => q.title && (Number(q.course_id) === course.id || Number(q.courseId) === course.id)));
        this.isLoadingQuizzes.set(false);
      },
      error: () => this.isLoadingQuizzes.set(false),
    });
  }

  closeQuizPanel(): void { this.quizPanelCourse.set(null); this.editingQuiz.set(null); }

  startEditQuiz(quiz: Quiz): void {
    this.editingQuiz.set(quiz);
    this.quizSaveMsg.set(''); this.quizSaveErr.set('');
    this.editForm = this.fb.group({
      title: [quiz.title, Validators.required],
      difficulty_level: [quiz.difficulty_level, Validators.required],
      time_limit_minutes: [quiz.time_limit_minutes, [Validators.required, Validators.min(1)]],
      questions: this.fb.array((quiz.questions || []).map(q => this.fb.group({
        id: [q.id],
        question_text: [q.question_text, Validators.required],
        correct_answer: [q.correct_answer, Validators.required],
        explanation: [q.explanation || ''],
        options: this.fb.array((q.options || []).map(o => this.fb.control(o, Validators.required))),
      }))),
    });
  }

  get questionsArray(): FormArray { return this.editForm.get('questions') as FormArray; }
  getOptionsArray(qi: number): FormArray { return (this.questionsArray.at(qi) as FormGroup).get('options') as FormArray; }
  getOptionValue(qi: number, oi: number): string { return this.getOptionsArray(qi).at(oi).value; }
  isCorrect(qi: number, opt: string): boolean { return (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.value === opt; }
  setCorrect(qi: number, opt: string): void { (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.setValue(opt); }

  swapOptions(qi: number, i: number, j: number): void {
    const arr = this.getOptionsArray(qi);
    const a = arr.at(i).value; const b = arr.at(j).value;
    arr.at(i).setValue(b); arr.at(j).setValue(a);
    const correctCtrl = (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!;
    if (correctCtrl.value === a) correctCtrl.setValue(b);
    else if (correctCtrl.value === b) correctCtrl.setValue(a);
  }

  saveQuiz(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const quiz = this.editingQuiz(); if (!quiz) return;
    this.isSavingQuiz.set(true); this.quizSaveErr.set('');
    const val = this.editForm.value;
    this.http.put(`${environment.apiUrl}/quizzes/${quiz.id}`, val).subscribe({
      next: () => {
        this.quizzes.update(list => list.map(q => q.id === quiz.id ? { ...q, ...val } : q));
        this.quizSaveMsg.set('✓ Quiz updated successfully!');
        this.isSavingQuiz.set(false);
        setTimeout(() => { this.editingQuiz.set(null); this.quizSaveMsg.set(''); }, 1500);
      },
      error: err => { this.quizSaveErr.set(err.error?.message || 'Save failed.'); this.isSavingQuiz.set(false); },
    });
  }

  cancelEdit(): void { this.editingQuiz.set(null); this.quizSaveMsg.set(''); this.quizSaveErr.set(''); }

  publishQuiz(quiz: Quiz): void {
    this.isPublishingId.set(quiz.id);
    this.http.patch(`${environment.apiUrl}/quizzes/${quiz.id}/publish`, {}).subscribe({
      next: () => { this.quizzes.update(l => l.map(q => q.id === quiz.id ? { ...q, status: 'PUBLISHED' } : q)); this.isPublishingId.set(null); this.showToast('Quiz published!'); },
      error: () => this.isPublishingId.set(null),
    });
  }

  unpublishQuiz(quiz: Quiz): void {
    this.isPublishingId.set(quiz.id);
    this.http.patch(`${environment.apiUrl}/quizzes/${quiz.id}/unpublish`, {}).subscribe({
      next: () => { this.quizzes.update(l => l.map(q => q.id === quiz.id ? { ...q, status: 'DRAFT' } : q)); this.isPublishingId.set(null); this.showToast('Quiz unpublished.'); },
      error: () => this.isPublishingId.set(null),
    });
  }

deleteQuiz(quiz: Quiz): void {
  this.openDialog({
    title: 'Delete Quiz',
    message: `Are you sure you want to delete "${quiz.title}"? This will also remove all student attempts and cannot be undone.`,
    type: 'danger',
    confirmLabel: 'Yes, Delete',
    action: () => {
      this.isDeletingId.set(quiz.id);
      this.http.delete(`${environment.apiUrl}/quizzes/${quiz.id}`).subscribe({
        next: () => {
          this.quizzes.update(l => l.filter(q => q.id !== quiz.id));
          this.isDeletingId.set(null);
          this.showToast('Quiz deleted.');
        },
        error: () => this.isDeletingId.set(null),
      });
    },
  });
}

  // ── Course actions ──────────────────────────────────────
  openDialog(opts: { title: string; message: string; type?: 'danger'|'warning'|'info'; confirmLabel?: string; action: () => void }): void {
    this.dialogTitle.set(opts.title); this.dialogMessage.set(opts.message);
    this.dialogType.set(opts.type ?? 'danger'); this.dialogConfirmLabel.set(opts.confirmLabel ?? 'Confirm');
    this.pendingAction.set(opts.action); this.showDialog.set(true);
  }
  onDialogConfirmed(): void { const a = this.pendingAction(); this.showDialog.set(false); this.pendingAction.set(null); if (a) a(); }
  onDialogCancelled(): void { this.showDialog.set(false); this.pendingAction.set(null); }
  navigate(path: string): void { this.router.navigate([path]); }
  createCourse(): void { this.router.navigate(['/courses/new']); }
  editCourse(id: number): void { this.router.navigate(['/courses', id, 'edit']); }

  toggleStatus(course: Course): void {
    const pub = course.status === 'PUBLISHED';
    this.openDialog({
      title: pub ? 'Unpublish Course' : 'Publish Course',
      message: pub ? `"${course.title}" will be hidden from students.` : `"${course.title}" will be visible to all students.`,
      type: pub ? 'warning' : 'info', confirmLabel: pub ? 'Yes, Unpublish' : 'Yes, Publish',
      action: () => {
        const req = pub ? this.courseService.unpublish(course.id) : this.courseService.publish(course.id);
        req.subscribe({ next: u => { this.courses.update(l => l.map(c => c.id === u.id ? u : c)); this.showToast(`Course ${u.status === 'PUBLISHED' ? 'published' : 'unpublished'}.`); }, error: () => this.showToast('Failed.') });
      },
    });
  }

  confirmDelete(course: Course): void {
    this.openDialog({
      title: 'Delete Course', message: `"${course.title}" will be permanently deleted.`, type: 'danger', confirmLabel: 'Yes, Delete',
      action: () => { this.courseService.delete(course.id).subscribe({ next: () => { this.courses.update(l => l.filter(c => c.id !== course.id)); this.showToast('Course deleted.'); }, error: () => this.showToast('Failed.') }); },
    });
  }

  private showToast(msg: string): void { this.toastMessage.set(msg); setTimeout(() => this.toastMessage.set(''), 3000); }
  getDifficultyClass(level: string): string { return level?.toLowerCase() ?? ''; }
  logout(): void { this.authService.logout(); }
}