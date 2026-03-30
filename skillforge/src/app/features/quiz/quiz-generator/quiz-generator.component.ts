import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../shared/models/course.model';
import { environment } from '../../../../environments/environment';

interface GeneratedQuestion { question_text: string; options: string[]; correct_answer: string; explanation: string; }
interface GeneratedQuiz { id: number; title: string; status: string; questions: GeneratedQuestion[]; }
interface UsageInfo { used: number; limit: number; percent: number; warning: boolean; exhausted: boolean; }

@Component({
  selector: 'app-quiz-generator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quiz-generator.component.html',
  styleUrl: './quiz-generator.component.scss',
})
export class QuizGeneratorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  authService = inject(AuthService);
  private courseService = inject(CourseService);

  mode = signal<'ai' | 'manual'>('ai');
  courses = signal<Course[]>([]);
  isLoadingCourses = signal(true);
  isGenerating = signal(false);
  generatedQuiz = signal<GeneratedQuiz | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  usage = signal<UsageInfo | null>(null);
  showUsageWarning = signal(false);
  isPublishing = signal(false);
  isUnpublishing = signal(false);
  isDeleting = signal(false);
  publishMessage = signal('');

  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  questionCounts = [3, 5, 10, 15, 20];
  optionLabels = ['A', 'B', 'C', 'D'];

  form = this.fb.group({
    topic: ['', [Validators.required, Validators.minLength(3)]],
    course_id: ['', Validators.required],
    num_questions: [5, Validators.required],
    difficulty: ['INTERMEDIATE', Validators.required],
  });

  manualForm = this.fb.group({
    title: ['', Validators.required],
    course_id: ['', Validators.required],
    difficulty: ['BEGINNER', Validators.required],
    time_limit_minutes: [30, [Validators.required, Validators.min(1)]],
    questions: this.fb.array([]),
  });

  isCreatingManual = signal(false);
  manualSuccess = signal('');
  manualError = signal('');
  manualCreatedQuiz = signal<any>(null);
  isPublishingManual = signal(false);

  get questionsArray(): FormArray { return this.manualForm.get('questions') as FormArray; }

  getOptionsArray(qi: number): FormArray {
    return (this.questionsArray.at(qi) as FormGroup).get('options') as FormArray;
  }

  getOptionControl(qi: number, oi: number): FormControl {
    return this.getOptionsArray(qi).at(oi) as FormControl;
  }

  getOptionValue(qi: number, oi: number): string {
    return this.getOptionControl(qi, oi).value;
  }

  isCorrectAnswer(qi: number, opt: string): boolean {
    return (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.value === opt;
  }

  setCorrectAnswer(qi: number, opt: string): void {
    (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!.setValue(opt);
  }

  isQTextInvalid(qi: number): boolean {
    const ctrl = (this.questionsArray.at(qi) as FormGroup).get('question_text')!;
    return ctrl.invalid && ctrl.touched;
  }

  isCorrectAnswerInvalid(qi: number): boolean {
    const ctrl = (this.questionsArray.at(qi) as FormGroup).get('correct_answer')!;
    return ctrl.invalid && ctrl.touched;
  }

  addQuestion(): void {
    this.questionsArray.push(this.fb.group({
      question_text: ['', Validators.required],
      correct_answer: ['', Validators.required],
      explanation: [''],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]),
    }));
  }

  removeQuestion(qi: number): void { this.questionsArray.removeAt(qi); }

  ngOnInit(): void {
    this.addQuestion();
    forkJoin({
      courses: this.courseService.getAll().pipe(catchError(() => of([]))),
      usage: this.http.get<{ usage: UsageInfo }>(`${environment.apiUrl}/quizzes/ai-usage`)
        .pipe(map(r => r.usage), catchError(() => of(null))),
    }).subscribe(({ courses, usage }) => {
      this.courses.set(courses);
      this.isLoadingCourses.set(false);
      if (usage) { this.usage.set(usage); if (usage.warning) this.showUsageWarning.set(true); }
    });
  }

  setMode(m: 'ai' | 'manual'): void {
    this.mode.set(m);
    this.errorMessage.set(''); this.successMessage.set('');
    this.manualError.set(''); this.manualSuccess.set('');
    this.manualCreatedQuiz.set(null);
  }

  createManualQuiz(): void {
    if (this.manualForm.invalid || this.questionsArray.length === 0) {
      this.manualForm.markAllAsTouched();
      this.manualError.set('Please fill in all required fields and add at least one question.');
      return;
    }
    for (let i = 0; i < this.questionsArray.length; i++) {
      const q = this.questionsArray.at(i) as FormGroup;
      if (!q.get('correct_answer')!.value) {
        this.manualError.set(`Please select the correct answer for Question ${i + 1}.`);
        return;
      }
    }
    this.isCreatingManual.set(true);
    this.manualError.set(''); this.manualSuccess.set('');
    const val = this.manualForm.value;
    const payload = {
      title: val.title,
      course_id: parseInt(val.course_id as any, 10),
      difficulty_level: val.difficulty,
      time_limit_minutes: parseInt(val.time_limit_minutes as any, 10),
      generated_by_ai: false,
      questions: (val.questions as any[]).map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        marks: 1,
      })),
    };
    this.http.post<{ quiz: any }>(`${environment.apiUrl}/quizzes`, payload).subscribe({
      next: r => { this.manualCreatedQuiz.set(r.quiz); this.manualSuccess.set('✓ Quiz created successfully!'); this.isCreatingManual.set(false); },
      error: err => { this.manualError.set(err.error?.message || 'Failed to create quiz.'); this.isCreatingManual.set(false); },
    });
  }

  publishManualQuiz(): void {
    const quiz = this.manualCreatedQuiz(); if (!quiz) return;
    this.isPublishingManual.set(true);
    this.http.patch(`${environment.apiUrl}/quizzes/${quiz.id}/publish`, {}).subscribe({
      next: () => { this.manualCreatedQuiz.update(q => ({ ...q, status: 'PUBLISHED' })); this.manualSuccess.set('✓ Quiz published! Students can now attempt it.'); this.isPublishingManual.set(false); },
      error: () => this.isPublishingManual.set(false),
    });
  }

  resetManualForm(): void {
    this.manualForm.reset({ difficulty: 'BEGINNER', time_limit_minutes: 30 });
    while (this.questionsArray.length) this.questionsArray.removeAt(0);
    this.addQuestion();
    this.manualSuccess.set(''); this.manualError.set(''); this.manualCreatedQuiz.set(null);
  }

  get manualQuizPublished(): boolean { return this.manualCreatedQuiz()?.status === 'PUBLISHED'; }
  get manualQuizTitle(): string { return this.manualCreatedQuiz()?.title ?? ''; }
  get manualQuizStatus(): string { return this.manualCreatedQuiz()?.status ?? 'DRAFT'; }

  getUsageBarColor(): string {
    const pct = this.usage()?.percent ?? 0;
    if (pct >= 90) return '#e74c3c'; if (pct >= 75) return '#f39c12'; return '#27ae60';
  }

  generate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.errorMessage.set('Please fill in all required fields.'); return; }
    if (this.usage()?.exhausted) { this.errorMessage.set('Daily AI quota exhausted.'); return; }
    this.isGenerating.set(true); this.errorMessage.set(''); this.successMessage.set(''); this.generatedQuiz.set(null); this.publishMessage.set('');
    const payload = { topic: this.form.value.topic, course_id: parseInt(this.form.value.course_id as any, 10), num_questions: parseInt(this.form.value.num_questions as any, 10), difficulty: this.form.value.difficulty };
    this.http.post<{ message: string; quiz: GeneratedQuiz; usage: UsageInfo }>(`${environment.apiUrl}/quizzes/generate-ai`, payload).subscribe({
      next: r => { this.generatedQuiz.set(r.quiz); this.successMessage.set(r.message); if (r.usage) { this.usage.set(r.usage); if (r.usage.warning) this.showUsageWarning.set(true); } this.isGenerating.set(false); },
      error: err => { const b = err.error; this.errorMessage.set(b?.message || 'AI service unavailable.'); if (b?.usage) this.usage.set(b.usage); if (b?.exhausted) this.showUsageWarning.set(true); this.isGenerating.set(false); },
    });
  }

  get isPublished(): boolean { return this.generatedQuiz()?.status === 'PUBLISHED'; }

  publishQuiz(): void {
    const quiz = this.generatedQuiz(); if (!quiz) return;
    this.isPublishing.set(true); this.publishMessage.set('');
    this.http.patch<{ quiz: GeneratedQuiz }>(`${environment.apiUrl}/quizzes/${quiz.id}/publish`, {}).subscribe({
      next: () => { this.generatedQuiz.update(q => q ? { ...q, status: 'PUBLISHED' } : q); this.publishMessage.set('✓ Quiz published!'); this.isPublishing.set(false); },
      error: () => { this.publishMessage.set('Failed to publish.'); this.isPublishing.set(false); }
    });
  }

  unpublishQuiz(): void {
    const quiz = this.generatedQuiz(); if (!quiz) return;
    this.isUnpublishing.set(true);
    this.http.patch<{ quiz: GeneratedQuiz }>(`${environment.apiUrl}/quizzes/${quiz.id}/unpublish`, {}).subscribe({
      next: () => { this.generatedQuiz.update(q => q ? { ...q, status: 'DRAFT' } : q); this.publishMessage.set('Quiz unpublished.'); this.isUnpublishing.set(false); },
      error: () => this.isUnpublishing.set(false),
    });
  }

  deleteQuiz(): void {
    const quiz = this.generatedQuiz(); if (!quiz) return;
    this.isDeleting.set(true);
    this.http.delete(`${environment.apiUrl}/quizzes/${quiz.id}`).subscribe({
      next: () => { this.generatedQuiz.set(null); this.publishMessage.set(''); this.successMessage.set('Quiz deleted.'); this.isDeleting.set(false); },
      error: () => this.isDeleting.set(false),
    });
  }

  dismissWarning(): void { this.showUsageWarning.set(false); }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}
