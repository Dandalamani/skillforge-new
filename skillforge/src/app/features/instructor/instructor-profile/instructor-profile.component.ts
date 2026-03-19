import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface UserProfile {
  id: number; name: string; email: string; role: string;
  dob?: string; gender?: string; location?: string; bio?: string;
  linkedin?: string; github?: string; twitter?: string; website?: string;
  createdAt: string;
}
interface InstructorStats {
  totalCourses: number; publishedCourses: number; totalStudents: number; aiQuizzes: number;
}

@Component({
  selector: 'app-instructor-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './instructor-profile.component.html',
  styleUrl: './instructor-profile.component.scss',
})
export class InstructorProfileComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  profile = signal<UserProfile | null>(null);
  stats = signal<InstructorStats | null>(null);
  isLoading = signal(true);
  isEditing = signal(false);
  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');
  activeTab = signal<'profile' | 'security'>('profile');
  isChangingPassword = signal(false);
  pwSuccess = signal('');
  pwError = signal('');

  profileForm = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    dob:         [''],
    gender:      [''],
    location:    [''],
    bio:         [''],
    linkedin:    [''],
    github:      [''],
    twitter:     [''],
    website:     [''],
    expertise:   [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  get initials(): string {
    return (this.profile()?.name ?? '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  get memberSince(): string {
    const d = this.profile()?.createdAt;
    return d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  }

  ngOnInit(): void {
    this.http.get<{ user: UserProfile }>(`${environment.apiUrl}/profile`).subscribe({
      next: r => {
        this.profile.set(r.user);
        this.isLoading.set(false);
        this.patchForm(r.user);
      },
      error: () => this.isLoading.set(false),
    });
    // Load instructor stats from dashboard
    this.http.get<any>(`${environment.apiUrl}/users/instructor/analytics`).subscribe({
      next: r => {
        this.stats.set({
          totalCourses: r.analytics?.totalCourses ?? 0,
          publishedCourses: r.analytics?.publishedCourses ?? 0,
          totalStudents: r.analytics?.totalStudents ?? 0,
          aiQuizzes: r.analytics?.aiQuizzes ?? 0,
        });
      },
      error: () => {},
    });
  }

  patchForm(u: UserProfile): void {
    this.profileForm.patchValue({
      name: u.name, dob: u.dob ?? '', gender: u.gender ?? '',
      location: u.location ?? '', bio: u.bio ?? '',
      linkedin: u.linkedin ?? '', github: u.github ?? '',
      twitter: u.twitter ?? '', website: u.website ?? '',
    });
  }

  startEdit(): void { this.isEditing.set(true); this.saveSuccess.set(''); this.saveError.set(''); }
  cancelEdit(): void { this.isEditing.set(false); if (this.profile()) this.patchForm(this.profile()!); }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSaving.set(true); this.saveError.set('');
    this.http.put<{ user: UserProfile }>(`${environment.apiUrl}/profile`, this.profileForm.value).subscribe({
      next: r => {
        this.profile.set(r.user); this.isEditing.set(false); this.isSaving.set(false);
        this.saveSuccess.set('Profile updated successfully!');
        setTimeout(() => this.saveSuccess.set(''), 3000);
      },
      error: err => { this.saveError.set(err.error?.message || 'Failed to save.'); this.isSaving.set(false); },
    });
  }

  changePassword(): void {
    const f = this.passwordForm.value;
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    if (f.newPassword !== f.confirmPassword) { this.pwError.set('Passwords do not match.'); return; }
    this.isChangingPassword.set(true); this.pwError.set('');
    this.http.put(`${environment.apiUrl}/profile/password`, {
      currentPassword: f.currentPassword, newPassword: f.newPassword,
    }).subscribe({
      next: () => {
        this.pwSuccess.set('Password changed!'); this.passwordForm.reset(); this.isChangingPassword.set(false);
        setTimeout(() => this.pwSuccess.set(''), 3000);
      },
      error: err => { this.pwError.set(err.error?.message || 'Failed.'); this.isChangingPassword.set(false); },
    });
  }

  close(): void { this.closed.emit(); }
}