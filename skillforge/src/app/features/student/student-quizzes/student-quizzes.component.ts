import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface StudentQuiz {
  id: number; title: string; description: string; course: string; courseId: number;
  difficulty: string; timeLimit: number; generatedByAi: boolean;
  attempted: boolean; score: number | null; attemptTime: string | null;
}
interface Question {
  id: number; question_text: string; options: string[];
  correct_answer: string; explanation: string; marks: number;
}
interface QuizDetail { id: number; title: string; questions: Question[]; time_limit_minutes: number; }

@Component({
  selector: 'app-student-quizzes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-quizzes.component.html',
  styleUrl: './student-quizzes.component.scss',
})
export class StudentQuizzesComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  quizzes = signal<StudentQuiz[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  filter = signal<'all' | 'pending' | 'completed'>('all');

  // Quiz taking state
  activeQuiz = signal<QuizDetail | null>(null);
  isLoadingQuiz = signal(false);
  currentQuestion = signal(0);
  answers = signal<Record<number, string>>({});
  timeLeft = signal(0);
  isSubmitting = signal(false);
  quizResult = signal<{ score: string; totalMarks: number; gradedAnswers: Record<string, any> } | null>(null);
  private timerInterval: any;

  get filtered() {
    const f = this.filter();
    const all = this.quizzes();
    if (f === 'pending') return all.filter(q => !q.attempted);
    if (f === 'completed') return all.filter(q => q.attempted);
    return all;
  }

  ngOnInit(): void {
    this.loadQuizzes();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  loadQuizzes(): void {
    this.http.get<{ quizzes: StudentQuiz[] }>(`${environment.apiUrl}/student/quizzes`).subscribe({
      next: r => { this.quizzes.set(r.quizzes); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load quizzes.'); this.isLoading.set(false); },
    });
  }

  startQuiz(quizId: number): void {
    this.isLoadingQuiz.set(true);
    this.quizResult.set(null);
    this.answers.set({});
    this.currentQuestion.set(0);
    this.http.get<{ quiz: QuizDetail }>(`${environment.apiUrl}/quizzes/${quizId}`).subscribe({
      next: r => {
        this.activeQuiz.set(r.quiz);
        this.isLoadingQuiz.set(false);
        this.timeLeft.set((r.quiz.time_limit_minutes || 10) * 60);
        this.startTimer();
      },
      error: () => this.isLoadingQuiz.set(false),
    });
  }

  startTimer(): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const t = this.timeLeft() - 1;
      if (t <= 0) {
        this.timeLeft.set(0);
        this.clearTimer();
        this.submitQuiz();
      } else {
        this.timeLeft.set(t);
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  get formattedTime(): string {
    const t = this.timeLeft();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get isTimeLow(): boolean { return this.timeLeft() <= 60 && this.timeLeft() > 0; }

  selectAnswer(questionId: number, option: string): void {
    this.answers.update(a => ({ ...a, [questionId]: option }));
  }

  isSelected(questionId: number, option: string): boolean {
    return this.answers()[questionId] === option;
  }

  isAnswered(questionId: number): boolean {
    return !!this.answers()[questionId];
  }

  get answeredCount(): number {
    return Object.keys(this.answers()).length;
  }

  goToQuestion(index: number): void { this.currentQuestion.set(index); }
  prevQuestion(): void { if (this.currentQuestion() > 0) this.currentQuestion.update(n => n - 1); }
  nextQuestion(): void {
    const quiz = this.activeQuiz();
    if (quiz && this.currentQuestion() < quiz.questions.length - 1) this.currentQuestion.update(n => n + 1);
  }

  submitQuiz(): void {
    const quiz = this.activeQuiz();
    if (!quiz) return;
    this.clearTimer();
    this.isSubmitting.set(true);

    // Convert answer keys to strings for backend
    const answersPayload: Record<string, string> = {};
    const ans = this.answers();
    for (const key of Object.keys(ans)) { answersPayload[key] = ans[Number(key)]; }

    this.http.post<{ result: any }>(`${environment.apiUrl}/quizzes/${quiz.id}/attempt`, {
      answers: answersPayload,
    }).subscribe({
      next: r => {
        this.quizResult.set(r.result);
        this.isSubmitting.set(false);
        this.loadQuizzes(); // refresh list to show updated score
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  closeQuiz(): void {
    this.clearTimer();
    this.activeQuiz.set(null);
    this.quizResult.set(null);
    this.answers.set({});
    this.currentQuestion.set(0);
  }

  isCorrect(questionId: string): boolean {
    const result = this.quizResult();
    return result?.gradedAnswers?.[questionId]?.correct ?? false;
  }

  getScoreClass(score: number | null): string {
    if (score === null) return '';
    if (score >= 80) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
  }
  getDifficultyClass(d: string): string { return d?.toLowerCase() ?? ''; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}