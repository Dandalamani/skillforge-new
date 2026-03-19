import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface AiLog { id: number; quizTitle: string; course: string; difficulty: string; createdAt: string; }

@Component({ selector: 'app-admin-ai-logs', standalone: true, imports: [CommonModule], templateUrl: './admin-ai-logs.component.html', styleUrl: './admin-ai-logs.component.scss' })
export class AdminAiLogsComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);
  logs = signal<AiLog[]>([]);
  total = signal(0);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.http.get<{ logs: AiLog[]; total: number }>(`${environment.apiUrl}/admin/ai-logs`).subscribe({
      next: (res) => { this.logs.set(res.logs); this.total.set(res.total); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load AI logs.'); this.isLoading.set(false); },
    });
  }
  getDiffClass(d: string): string { return d?.toLowerCase() ?? ''; }
  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}