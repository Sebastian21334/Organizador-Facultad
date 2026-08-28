import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  access_token: string;
}

export interface MessageResponse {
  mensaje: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenRequest {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  nuevaPassword: string;
}

export interface PerfilResponse {
  nombre: string | null;
}

export interface JwtPayload {
  sub?: string;
  email?: string;
  nombre?: string;
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenKey = 'access_token';
  private readonly authenticated = signal(this.hasValidToken());
  private readonly nombreUsuario = signal<string | null>(null);

  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly currentUserName = this.nombreUsuario.asReadonly();

  constructor() {
    if (this.hasValidToken()) {
      // Se difiere para evitar dependencia circular: el interceptor de auth
      // inyecta AuthService, y si se dispara un HTTP call de forma síncrona
      // dentro de este constructor, Angular lanza NG0200 (circular dependency)
      // porque AuthService todavía no terminó de construirse.
      queueMicrotask(() => this.cargarPerfil());
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap(({ access_token }) => {
        this.setToken(access_token);
        this.cargarPerfil();
      }),
    );
  }

  register(request: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/auth/register', request);
  }

  verifyEmail(request: TokenRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/auth/verify-email', request);
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/auth/forgot-password', { email });
  }

  resetPassword(request: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/auth/reset-password', request);
  }

  getPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>('/auth/perfil');
  }

  actualizarPerfil(nombre: string): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>('/auth/perfil', { nombre }).pipe(
      tap(() => this.nombreUsuario.set(nombre?.trim().split(/\s+/)[0] ?? null)),
    );
  }

  cambiarPassword(contraseñaActual: string, nuevaPassword: string): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>('/auth/cambiar-password', { contraseñaActual, nuevaPassword });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.authenticated.set(false);
    this.nombreUsuario.set(null);
    void this.router.navigate(['/login']);
  }

  token(): string | null {
    return this.hasValidToken() ? localStorage.getItem(this.tokenKey) : null;
  }

  private cargarPerfil(): void {
    this.getPerfil().subscribe({
      next: (perfil) => this.nombreUsuario.set(perfil.nombre?.trim().split(/\s+/)[0] ?? null),
      error: () => this.nombreUsuario.set(null),
    });
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

  private decodeToken<T>(token: string): T {
    const payload = token.split('.')[1];
    if (!payload) return {} as T;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return JSON.parse(
      decodeURIComponent(
        normalized
          .split('')
          .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(''),
      ),
    ) as T;
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