import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../shared/models/course.model';
import { environment } from '../../../../environments/environment';

interface GeneratedQuestion { question_text: string; options: string[]; correct_answer: string; explanation: string; }
interface GeneratedQuiz { id: number; title: string; questions: GeneratedQuestion[]; }
interface UsageInfo { used: number; limit: number; percent: number; warning: boolean; exhausted: boolean; generatedBy?: string; }

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

  courses = signal<Course[]>([]);
  isLoadingCourses = signal(true);
  isGenerating = signal(false);
  generatedQuiz = signal<GeneratedQuiz | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  usage = signal<UsageInfo | null>(null);
  showUsageWarning = signal(false);

  difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  questionCounts = [3, 5, 10, 15, 20];

  form = this.fb.group({
    topic: ['', [Validators.required, Validators.minLength(3)]],
    course_id: ['', Validators.required],
    num_questions: [5, Validators.required],
    difficulty: ['INTERMEDIATE', Validators.required],
  });

  ngOnInit(): void {
    forkJoin({
      courses: this.courseService.getAll().pipe(catchError(() => of([]))),
      usage: this.http.get<{ usage: UsageInfo }>(`${environment.apiUrl}/quizzes/ai-usage`)
        .pipe(map(r => r.usage), catchError(() => of(null))),
    }).subscribe(({ courses, usage }) => {
      this.courses.set(courses);
      this.isLoadingCourses.set(false);
      if (usage) {
        this.usage.set(usage);
        if (usage.warning) this.showUsageWarning.set(true);
      }
    });
  }

  getUsageBarColor(): string {
    const pct = this.usage()?.percent ?? 0;
    if (pct >= 90) return '#e74c3c';
    if (pct >= 75) return '#f39c12';
    return '#27ae60';
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }
    if (this.usage()?.exhausted) {
      this.errorMessage.set('Daily AI quota exhausted. Resets at midnight.');
      return;
    }

    this.isGenerating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.generatedQuiz.set(null);

    // Explicitly parse types before sending
    const payload = {
      topic: this.form.value.topic,
      course_id: parseInt(this.form.value.course_id as any, 10),
      num_questions: parseInt(this.form.value.num_questions as any, 10),
      difficulty: this.form.value.difficulty,
    };

    this.http.post<{ message: string; quiz: GeneratedQuiz; usage: UsageInfo }>(
      `${environment.apiUrl}/quizzes/generate-ai`,
      payload
    ).subscribe({
      next: (res) => {
        this.generatedQuiz.set(res.quiz);
        this.successMessage.set(res.message);
        if (res.usage) {
          this.usage.set(res.usage);
          if (res.usage.warning) this.showUsageWarning.set(true);
        }
        this.isGenerating.set(false);
      },
      error: (err) => {
        const body = err.error;
        this.errorMessage.set(body?.message || 'AI service unavailable. Please try again.');
        if (body?.usage) this.usage.set(body.usage);
        if (body?.exhausted) this.showUsageWarning.set(true);
        this.isGenerating.set(false);
      },
    });
  }

  dismissWarning(): void { this.showUsageWarning.set(false); }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}