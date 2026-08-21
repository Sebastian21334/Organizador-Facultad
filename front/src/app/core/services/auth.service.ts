import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  access_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'access_token';
  private readonly authenticated = signal(this.hasValidToken());

  readonly isAuthenticated = this.authenticated.asReadonly();

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap(({ access_token }) => this.setToken(access_token)),
    );
  }

  register(email: string, password: string, nombre?: string): Observable<AuthResponse> {
    const body = nombre ? { email, password, nombre } : { email, password };
    return this.http.post<AuthResponse>('/auth/register', body).pipe(
      tap(({ access_token }) => this.setToken(access_token)),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.authenticated.set(false);
    void this.router.navigate(['/login']);
  }

  token(): string | null {
    return this.hasValidToken() ? localStorage.getItem(this.tokenKey) : null;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.authenticated.set(true);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(this.decodeBase64Url(token.split('.')[1] ?? '')) as { exp?: number };
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem(this.tokenKey);
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem(this.tokenKey);
      return false;
    }
  }

  private decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
        .split('')
        .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
  }
}
