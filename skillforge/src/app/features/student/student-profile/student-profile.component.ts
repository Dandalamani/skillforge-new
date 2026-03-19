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

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.scss',
})
export class StudentProfileComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  isEditing = signal(false);
  isSaving = signal(false);
  saveSuccess = signal('');
  saveError = signal('');
  activeTab = signal<'profile' | 'security'>('profile');

  // Password
  isChangingPassword = signal(false);
  pwSuccess = signal('');
  pwError = signal('');

  profileForm = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(2)]],
    dob:      [''],
    gender:   [''],
    location: [''],
    bio:      [''],
    linkedin: [''],
    github:   [''],
    twitter:  [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  get initials(): string {
    const name = this.profile()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  get memberSince(): string {
    const d = this.profile()?.createdAt;
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getAge(): number | null {
    const dob = this.profile()?.dob;
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }

  ngOnInit(): void { this.loadProfile(); }

  loadProfile(): void {
    this.http.get<{ user: UserProfile }>(`${environment.apiUrl}/profile`).subscribe({
      next: r => { this.profile.set(r.user); this.isLoading.set(false); this.patchForm(r.user); },
      error: () => this.isLoading.set(false),
    });
  }

  patchForm(u: UserProfile): void {
    this.profileForm.patchValue({
      name: u.name, dob: u.dob ?? '', gender: u.gender ?? '',
      location: u.location ?? '', bio: u.bio ?? '',
      linkedin: u.linkedin ?? '', github: u.github ?? '', twitter: u.twitter ?? '',
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
        this.saveSuccess.set('Profile updated!');
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
  logout(): void { this.authService.logout(); }
}