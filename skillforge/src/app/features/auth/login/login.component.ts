import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email(): AbstractControl {
    return this.form.get('email')!;
  }
  get password(): AbstractControl {
    return this.form.get('password')!;
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.authService.redirectByRole();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message ?? 'Invalid credentials. Please try again.'
        );
      },
    });
  }
}
