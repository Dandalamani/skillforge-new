import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../shared/models/user.model';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  roles: { value: UserRole; label: string; icon: string }[] = [
    { value: 'STUDENT', label: 'Student', icon: '🎓' },
    { value: 'INSTRUCTOR', label: 'Instructor', icon: '📚' },
    { value: 'ADMIN', label: 'Admin', icon: '⚙️' },
  ];

  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['STUDENT' as UserRole, Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  get name() { return this.form.get('name')!; }
  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  selectRole(role: UserRole): void {
    this.form.patchValue({ role });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { name, email, password, role } = this.form.value;

    this.authService
      .register({ name: name!, email: email!, password: password!, role: role! })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.authService.redirectByRole();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message ?? 'Registration failed. Please try again.');
        },
      });
  }
}