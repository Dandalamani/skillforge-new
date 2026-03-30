import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type ContentType = 'VIDEO' | 'PDF' | 'LINK';
interface Content {
  id: number; title: string; type: ContentType;
  url: string; file_name?: string; file_size?: number;
  description?: string; order_index: number; createdAt: string;
}
interface Question {
  id: number; question_text: string; options: string[];
  correct_answer: string; explanation: string; marks: number;
}
interface Quiz {
  id: number; title: string; description: string; status: string;
  difficulty_level: string; time_limit_minutes: number;
  generated_by_ai: boolean; questions: Question[];
}

@Component({
  selector: 'app-course-content',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent, DatePipe],
  templateUrl: './course-content.component.html',
  styleUrl: './course-content.component.scss',
})
export class CourseContentComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  courseId = signal<number>(0);
  courseName = signal('');
  contents = signal<Content[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  activeTab = signal<'video' | 'pdf' | 'link'>('video');

  // Main panel toggle
  mainPanel = signal<'content' | 'quizzes'>('content');

  // Quiz state
  quizzes = signal<Quiz[]>([]);
  isLoadingQuizzes = signal(false);
  quizzesLoaded = false;
  editingQuiz = signal<Quiz | null>(null);
  isSavingQuiz = signal(false);
  quizSaveSuccess = signal('');
  quizSaveError = signal('');
  isPublishingId = signal<number | null>(null);
  isDeletingId = signal<number | null>(null);
  editForm!: FormGroup;

  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  // Upload/link state
  uploadProgress = signal<number | null>(null);
  uploadError = signal('');
  uploadSuccess = signal('');
  isUploading = signal(false);
  linkForm = this.fb.group({
    title: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    description: [''],
  });
  linkSuccess = signal('');
  linkError = signal('');
  isAddingLink = signal(false);
  selectedFile = signal<File | null>(null);
  uploadTitle = signal('');
  uploadDesc = signal('');

  // Confirm dialog
  showDialog = signal(false);
  dialogTitle = signal('');
  dialogMessage = signal('');
  pendingDeleteId = signal<number | null>(null);

  get titleControl(): FormControl { return this.linkForm.controls.title as FormControl; }
  get urlControl(): FormControl { return this.linkForm.controls.url as FormControl; }
  get descControl(): FormControl { return this.linkForm.controls.description as FormControl; }
  get apiBase(): string { return `${environment.apiUrl}/courses/${this.courseId()}/contents`; }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.courseId.set(id);
    this.loadContents();
    this.http.get<{ course: { title: string } }>(`${environment.apiUrl}/courses/${id}`).subscribe({
      next: r => this.courseName.set(r.course.title),
    });
  }

  loadContents(): void {
    this.isLoading.set(true);
    this.http.get<{ contents: Content[] }>(this.apiBase).subscribe({
      next: r => { this.contents.set(r.contents); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load content.'); this.isLoading.set(false); },
    });
  }

  showPanel(panel: 'content' | 'quizzes'): void {
    this.mainPanel.set(panel);
    if (panel === 'quizzes' && !this.quizzesLoaded) {
      this.loadQuizzes();
    }
  }

  loadQuizzes(): void {
    this.isLoadingQuizzes.set(true);
    this.http.get<any>(`${environment.apiUrl}/quizzes?course_id=${this.courseId()}`).subscribe({
      next: r => {
        const all: Quiz[] = r.quizzes ?? r ?? [];
        this.quizzes.set(all.filter((q: Quiz) => Number((q as any).course_id) === this.courseId() || Number((q as any).courseId) === this.courseId()));
        this.isLoadingQuizzes.set(false);
        this.quizzesLoaded = true;
      },
      error: () => { this.isLoadingQuizzes.set(false); this.quizzesLoaded = true; },
    });
  }

  // ── Quiz Edit ──────────────────────────────────────────
  startEditQuiz(quiz: Quiz): void {
    this.editingQuiz.set(quiz);
    this.quizSaveSuccess.set(''); this.quizSaveError.set('');
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
  getOptionControl(qi: number, oi: number): FormControl { return this.getOptionsArray(qi).at(oi) as FormControl; }

  swapOptions(qi: number, i: number, j: number): void {
    const arr = this.getOptionsArray(qi);
    const a = arr.at(i).value;
    arr.at(i).setValue(arr.at(j).value);
    arr.at(j).setValue(a);
    // update correct_answer if needed
    const correctCtrl = (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!;
    if (correctCtrl.value === a) correctCtrl.setValue(arr.at(i).value);
    else if (correctCtrl.value === arr.at(i).value) correctCtrl.setValue(a);
  }

  setCorrectAnswer(qi: number, option: string): void {
    (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.setValue(option);
  }

  isCorrectAnswer(qi: number, option: string): boolean {
    return (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.value === option;
  }

  saveQuiz(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const quiz = this.editingQuiz(); if (!quiz) return;
    this.isSavingQuiz.set(true); this.quizSaveError.set('');
    const val = this.editForm.value;
    this.http.put<{ quiz: any }>(`${environment.apiUrl}/quizzes/${quiz.id}`, val).subscribe({
      next: () => {
        this.quizzes.update(list => list.map(q => q.id === quiz.id
          ? { ...q, title: val.title, difficulty_level: val.difficulty_level, time_limit_minutes: val.time_limit_minutes, questions: val.questions }
          : q));
        this.quizSaveSuccess.set('Quiz updated!');
        this.isSavingQuiz.set(false);
        setTimeout(() => { this.editingQuiz.set(null); this.quizSaveSuccess.set(''); }, 1200);
      },
      error: err => { this.quizSaveError.set(err.error?.message || 'Save failed.'); this.isSavingQuiz.set(false); },
    });
  }

  cancelEdit(): void { this.editingQuiz.set(null); this.quizSaveSuccess.set(''); this.quizSaveError.set(''); }

  publishQuiz(quiz: Quiz): void {
    this.isPublishingId.set(quiz.id);
    this.http.patch(`${environment.apiUrl}/quizzes/${quiz.id}/publish`, {}).subscribe({
      next: () => { this.quizzes.update(l => l.map(q => q.id === quiz.id ? { ...q, status: 'PUBLISHED' } : q)); this.isPublishingId.set(null); },
      error: () => this.isPublishingId.set(null),
    });
  }

  unpublishQuiz(quiz: Quiz): void {
    this.isPublishingId.set(quiz.id);
    this.http.patch(`${environment.apiUrl}/quizzes/${quiz.id}/unpublish`, {}).subscribe({
      next: () => { this.quizzes.update(l => l.map(q => q.id === quiz.id ? { ...q, status: 'DRAFT' } : q)); this.isPublishingId.set(null); },
      error: () => this.isPublishingId.set(null),
    });
  }

  deleteQuiz(quiz: Quiz): void {
    if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    this.isDeletingId.set(quiz.id);
    this.http.delete(`${environment.apiUrl}/quizzes/${quiz.id}`).subscribe({
      next: () => { this.quizzes.update(l => l.filter(q => q.id !== quiz.id)); this.isDeletingId.set(null); },
      error: () => this.isDeletingId.set(null),
    });
  }

  // ── Content upload/link (unchanged) ──
  setTab(tab: 'video' | 'pdf' | 'link'): void {
    this.activeTab.set(tab); this.selectedFile.set(null); this.uploadTitle.set(''); this.uploadDesc.set(''); this.uploadError.set(''); this.uploadSuccess.set('');
  }
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.selectedFile.set(file); if (!this.uploadTitle()) this.uploadTitle.set(file.name.replace(/\.[^/.]+$/, '')); this.uploadError.set('');
  }
  onFileDrop(event: DragEvent): void {
    event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (!file) return;
    this.selectedFile.set(file); if (!this.uploadTitle()) this.uploadTitle.set(file.name.replace(/\.[^/.]+$/, '')); this.uploadError.set('');
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); }
  clearFile(): void { this.selectedFile.set(null); }
  setUploadTitle(v: string): void { this.uploadTitle.set(v); }
  setUploadDesc(v: string): void { this.uploadDesc.set(v); }
  uploadFile(): void {
    const file = this.selectedFile(); if (!file || !this.uploadTitle()) { this.uploadError.set('Please select a file and enter a title.'); return; }
    const fd = new FormData(); fd.append('file', file); fd.append('title', this.uploadTitle()); fd.append('description', this.uploadDesc());
    this.isUploading.set(true); this.uploadProgress.set(0); this.uploadError.set(''); this.uploadSuccess.set('');
    this.http.post<{ content: Content }>(`${this.apiBase}/upload`, fd, { reportProgress: true, observe: 'events' }).subscribe({
      next: ev => {
        if (ev.type === HttpEventType.UploadProgress && ev.total) this.uploadProgress.set(Math.round((ev.loaded / ev.total) * 100));
        else if (ev.type === HttpEventType.Response) {
          const c = (ev.body as any).content;
          this.contents.update(l => [...l, c]); this.uploadSuccess.set(`"${c.title}" uploaded!`);
          this.selectedFile.set(null); this.uploadTitle.set(''); this.uploadDesc.set(''); this.uploadProgress.set(null); this.isUploading.set(false);
        }
      },
      error: err => { this.uploadError.set(err.error?.message || 'Upload failed.'); this.uploadProgress.set(null); this.isUploading.set(false); },
    });
  }
  addLink(): void {
    if (this.linkForm.invalid) { this.linkForm.markAllAsTouched(); return; }
    this.isAddingLink.set(true); this.linkError.set(''); this.linkSuccess.set('');
    this.http.post<{ content: Content }>(`${this.apiBase}/link`, this.linkForm.value).subscribe({
      next: r => { this.contents.update(l => [...l, r.content]); this.linkSuccess.set(`"${r.content.title}" added!`); this.linkForm.reset(); this.isAddingLink.set(false); },
      error: err => { this.linkError.set(err.error?.message || 'Failed.'); this.isAddingLink.set(false); },
    });
  }
  confirmDelete(c: Content): void { this.pendingDeleteId.set(c.id); this.dialogTitle.set('Delete Content'); this.dialogMessage.set(`"${c.title}" will be permanently removed.`); this.showDialog.set(true); }
  onDeleteConfirmed(): void {
    const id = this.pendingDeleteId(); this.showDialog.set(false); if (!id) return;
    this.http.delete(`${this.apiBase}/${id}`).subscribe({ next: () => this.contents.update(l => l.filter(c => c.id !== id)) });
    this.pendingDeleteId.set(null);
  }
  formatSize(bytes?: number): string { if (!bytes) return ''; return bytes < 1048576 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1048576).toFixed(1)} MB`; }
  byType(type: ContentType): Content[] { return this.contents().filter(c => c.type === type); }
  getFileUrl(url: string): string { return `http://localhost:3000${url}`; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
  closeDialog(): void { this.showDialog.set(false); }
}