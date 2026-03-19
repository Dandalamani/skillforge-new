import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'sf_token';
const USER_KEY = 'sf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _currentUser = signal<User | null>(this.loadUserFromStorage());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  currentUser = this._currentUser.asReadonly();
  token = this._token.asReadonly();
  isAuthenticated = computed(() => !!this._token());
  userRole = computed(() => this._currentUser()?.role ?? null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(tap((res) => this.handleAuth(res)));
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  redirectByRole(): void {
    const role = this._currentUser()?.role;
    switch (role) {
      case 'STUDENT':
        this.router.navigate(['/dashboard/student']);
        break;
      case 'INSTRUCTOR':
        this.router.navigate(['/dashboard/instructor']);
        break;
      case 'ADMIN':
        this.router.navigate(['/dashboard/admin']);
        break;
      default:
        this.router.navigate(['/auth/login']);
    }
  }

  private handleAuth(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._currentUser.set(res.user);
  }

  private loadUserFromStorage(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}
