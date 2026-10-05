import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { apiUrlInterceptor } from '../interceptors/api-url.interceptor';
import { environment } from '../../environments/environment';
import { authGuard, landingGuard } from '../guards/auth.guard';
import { listarPaginas } from './paginacion';
import { passwordBytes } from './password-policy';
import { FormControl } from '@angular/forms';

describe('Sesiones seguras del navegador (HTTP simulado, sin red)', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  const navigate = vi.fn().mockResolvedValue(true);
  const toast = { error: vi.fn(), success: vi.fn() };
  const api = environment.apiUrl;
  const session = { nombre: 'Seba González', recordatorioEmailHabilitado: false, recordatorioMinutos: null, csrfToken: 'csrf-de-prueba' };
  beforeEach(() => {
    localStorage.setItem('access_token', 'jwt-de-la-version-anterior');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiUrlInterceptor, authInterceptor])), provideHttpClientTesting(),
        { provide: Router, useValue: { navigate, createUrlTree: (commands: string[]) => commands.join('') } },
        { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController); client = TestBed.inject(HttpClient); auth = TestBed.inject(AuthService);
    vi.clearAllMocks();
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); localStorage.clear(); sessionStorage.clear(); });
  async function iniciar() {
    await Promise.resolve();
    const req = http.expectOne(api + '/auth/session');
    expect(req.request.withCredentials).toBe(true);
    req.flush(session);
  }
  it('borra JWT persistentes y restaura la sesión exclusivamente desde el servidor', async () => {
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    await iniciar();
    expect(auth.isAuthenticated()).toBe(true); expect(auth.currentUserName()).toBe('Seba');
    expect(auth.csrfToken()).toBe('csrf-de-prueba'); expect(auth.checkingSession()).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });
  it('las rutas esperan la comprobación del servidor, no un JWT manipulable', async () => {
    let privado: unknown; let portada: unknown;
    (TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as any).subscribe((result: unknown) => privado = result);
    (TestBed.runInInjectionContext(() => landingGuard({} as any, {} as any)) as any).subscribe((result: unknown) => portada = result);
    expect(privado).toBeUndefined();
    await iniciar(); expect(privado).toBe(true); expect(portada).toBe('/inicio');
  });
  it('sin sesión se muestra el lobby y se bloquean las secciones privadas', async () => {
    let resultado: unknown;
    (TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as any).subscribe((value: unknown) => resultado = value);
    await Promise.resolve(); http.expectOne(api + '/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(resultado).toBe('/'); expect(auth.isAuthenticated()).toBe(false);
  });
  it('envía cookie y CSRF a la API, pero no Authorization', async () => {
    await iniciar();
    client.patch('/tareas/id', { titulo: 'Parcial' }).subscribe();
    const req = http.expectOne(api + '/tareas/id');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-de-prueba');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.withCredentials).toBe(true); req.flush({});
  });
  it('no adjunta credenciales ni CSRF a sitios externos aunque el nombre se parezca', async () => {
    await iniciar();
    for (const url of ['https://externo.example/datos', 'https://' + new URL(api).hostname + '.atacante.example/datos']) {
      client.get(url).subscribe();
      const req = http.expectOne(url);
      expect(req.request.withCredentials).toBe(false);
      expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });
  it('el login no guarda el JWT y comprueba que el navegador recibió la cookie', async () => {
    await iniciar();
    auth.login('seba@example.com', 'una frase segura').subscribe();
    http.expectOne(api + '/auth/login').flush({ mensaje: 'Sesión iniciada.' });
    http.expectOne(api + '/auth/session').flush(session);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
  it('cierra la sesión también en el servidor y no finge éxito si no puede revocarla', async () => {
    await iniciar();
    auth.logout();
    http.expectOne(api + '/auth/logout').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.isAuthenticated()).toBe(true); expect(toast.error).toHaveBeenCalled();
    auth.logout();
    http.expectOne(api + '/auth/logout').flush({ mensaje: 'Sesiones cerradas.' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
  it('no pierde registros al leer varias páginas acotadas', async () => {
    await iniciar();
    let items: number[] = [];
    listarPaginas<number>(client, '/tareas').subscribe((result) => items = result);
    http.expectOne(api + '/tareas?limit=100&offset=0').flush(Array.from({ length: 100 }, (_, i) => i));
    http.expectOne(api + '/tareas?limit=100&offset=100').flush([100]);
    expect(items).toHaveLength(101);
  });
  it('la política de contraseña mide bytes Unicode, no solo caracteres', async () => {
    await iniciar();
    expect(passwordBytes(new FormControl('🔒'.repeat(20)))).toEqual({ passwordBytes: true });
    expect(passwordBytes(new FormControl('una frase segura de prueba'))).toBeNull();
  });
});
