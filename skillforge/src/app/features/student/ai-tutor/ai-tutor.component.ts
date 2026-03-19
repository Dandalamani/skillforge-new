import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface Message { role: 'user' | 'assistant'; text: string; time: Date; }

@Component({ selector: 'app-ai-tutor', standalone: true, imports: [CommonModule, ReactiveFormsModule], templateUrl: './ai-tutor.component.html', styleUrl: './ai-tutor.component.scss' })
export class AiTutorComponent implements AfterViewChecked {
  @ViewChild('chatBottom') chatBottom!: ElementRef;
  private router = inject(Router);
  private http = inject(HttpClient);
  authService = inject(AuthService);

  messages = signal<Message[]>([
    { role: 'assistant', text: 'Hi! I\'m your AI Tutor powered by GPT-4. Ask me anything about your courses, quizzes, or any topic you\'re studying! 🎓', time: new Date() }
  ]);
  isTyping = signal(false);
  input = new FormControl('');

  ngAfterViewChecked(): void {
    this.chatBottom?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }

  send(): void {
    const text = this.input.value?.trim();
    if (!text || this.isTyping()) return;
    this.messages.update(m => [...m, { role: 'user', text, time: new Date() }]);
    this.input.setValue('');
    this.isTyping.set(true);

    this.http.post<any>('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You are a helpful, encouraging AI tutor for an e-learning platform called SkillForge. Help students understand course topics, explain concepts clearly, and guide them through problems. Keep answers concise and friendly.',
      messages: [{ role: 'user', content: text }],
    }).subscribe({
      next: (res) => {
        const reply = res.content?.[0]?.text ?? 'Sorry, I could not generate a response.';
        this.messages.update(m => [...m, { role: 'assistant', text: reply, time: new Date() }]);
        this.isTyping.set(false);
      },
      error: () => {
        this.messages.update(m => [...m, { role: 'assistant', text: 'Sorry, I\'m having trouble connecting right now. Please try again later.', time: new Date() }]);
        this.isTyping.set(false);
      },
    });
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  navigate(path: string): void { this.router.navigate([path]); }
  logout(): void { this.authService.logout(); }
}