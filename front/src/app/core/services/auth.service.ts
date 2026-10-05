import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError, timeout } from 'rxjs';
import { ToastService } from './toast.service';

export interface AuthResponse { access_token?: string; mensaje?: string; }
export interface MessageResponse { mensaje: string; }
export interface RegisterRequest { email: string; password: string; nombre: string; }
export interface LoginRequest { email: string; password: string; }
export interface TokenRequest { token: string; password: string; }
export interface ResetPasswordRequest { token: string; nuevaPassword: string; }
export interface PerfilResponse { nombre: string | null; recordatorioEmailHabilitado: boolean; recordatorioMinutos: number | null; }
export interface PreferenciasRecordatorio { recordatorioEmailHabilitado: boolean; recordatorioMinutos: number | null; }
interface SessionResponse extends PerfilResponse { csrfToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authenticated = signal(false);
  private readonly checking = signal(true);
  private readonly nombreUsuario = signal<string | null>(null);
  private ready = false;
  private restoring?: Observable<boolean>;
  private csrf = '';
  private loggingOut = false;
  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly currentUserName = this.nombreUsuario.asReadonly();
  readonly checkingSession = this.checking.asReadonly();

  constructor() {
    // Elimina únicamente las credenciales persistentes de la versión anterior.
    try { localStorage.removeItem('access_token'); sessionStorage.removeItem('access_token'); } catch { /* El almacenamiento puede estar deshabilitado. La sesión no depende de él. */ }
    queueMicrotask(() => this.ensureSession().subscribe());
  }

  ensureSession(force = false): Observable<boolean> {
    if (!force && this.ready) return of(this.authenticated());
    if (!force && this.restoring) return this.restoring;
    this.restoring = this.http.get<SessionResponse>('/auth/session').pipe(
      timeout(15_000),
      tap((perfil) => {
        this.csrf = perfil.csrfToken;
        this.authenticated.set(true);
        this.nombreUsuario.set(perfil.nombre?.trim().split(/\s+/)[0] ?? null);
        this.ready = true;
        this.checking.set(false);
      }),
      map(() => true),
      catchError(() => { this.clearSession(); return of(false); }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.restoring;
  }

  csrfToken(): string { return this.csrf; }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', { email, password }).pipe(
      switchMap((respuesta) => this.ensureSession(true).pipe(switchMap((ok) => ok ? of(respuesta) :
        throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'No pudimos guardar la sesión. Revisá que las cookies estén permitidas.' } }))))),
    );
  }
  register(request: RegisterRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>('/auth/register', request); }
  verifyEmail(request: TokenRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>('/auth/verify-email', request); }
  resendVerification(email: string): Observable<MessageResponse> { return this.http.post<MessageResponse>('/auth/resend-verification', { email }); }
  forgotPassword(email: string): Observable<MessageResponse> { return this.http.post<MessageResponse>('/auth/forgot-password', { email }); }
  resetPassword(request: ResetPasswordRequest): Observable<MessageResponse> { return this.http.post<MessageResponse>('/auth/reset-password', request).pipe(tap(() => this.clearSession())); }
  getPerfil(): Observable<PerfilResponse> { return this.http.get<PerfilResponse>('/auth/perfil'); }

  actualizarPerfil(nombre: string, preferencias?: PreferenciasRecordatorio): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>('/auth/perfil', { nombre, ...preferencias }).pipe(
      tap(() => this.nombreUsuario.set(nombre?.trim().split(/\s+/)[0] ?? null)),
    );
  }
  cambiarPassword(contraseñaActual: string, nuevaPassword: string): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>('/auth/cambiar-password', { contraseñaActual, nuevaPassword }).pipe(
      tap(({ mensaje }) => { this.clearSession(); this.toast.success(mensaje); void this.router.navigate(['/login']); }),
    );
  }
  logout(): void {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.http.post<MessageResponse>('/auth/logout', {}).subscribe({
      next: () => { this.loggingOut = false; this.expireSession(); },
      error: (error: HttpErrorResponse) => {
        this.loggingOut = false;
        if (error.status === 401) this.expireSession();
        else this.toast.error('No se pudo cerrar la sesión en el servidor. Intentá de nuevo.');
      },
    });
  }
  expireSession(): void {
    this.clearSession();
    void this.router.navigate(['/']);
  }
  private clearSession(): void {
    this.authenticated.set(false); this.nombreUsuario.set(null); this.csrf = ''; this.ready = true; this.restoring = undefined;
    this.checking.set(false);
  }
}
