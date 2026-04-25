import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { environment } from '../../../environments/environment';

interface StudentData {
  id: number; name: string; email: string;
  quizAttempts: number; avgScore: number | null;
  joinedAt: string; lastActive: string;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss',
})
export class StudentsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  students = signal<StudentData[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  totalStudents  = computed(() => this.students().length);
  activeStudents = computed(() => this.students().filter(s => s.quizAttempts > 0).length);
  avgClassScore  = computed(() => {
    const w = this.students().filter(s => s.avgScore !== null);
    if (!w.length) return null;
    return (w.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / w.length).toFixed(1);
  });

  ngOnInit(): void {
    this.http.get<{ students: StudentData[] }>(`${environment.apiUrl}/users/students`).subscribe({
      next: r => { this.students.set(r.students); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load students.'); this.isLoading.set(false); },
    });
  }

  getScoreClass(score: number | null): string {
    if (score === null) return 'none';
    if (score >= 80) return 'high'; if (score >= 60) return 'mid'; return 'low';
  }
  getInitial(name: string): string { return name ? name[0].toUpperCase() : '?'; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}