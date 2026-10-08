import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { PushNotificationsService } from './push-notifications.service';
import { map, of } from 'rxjs';
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
  const push = { beforeLogout: vi.fn(() => of(undefined as void)) };
  const api = environment.apiUrl;
  const session = { nombre: 'Seba González', recordatorioEmailHabilitado: false, recordatorioMinutos: null, csrfToken: 'csrf-de-prueba' };
  beforeEach(() => {
    push.beforeLogout.mockReset().mockReturnValue(of(undefined));
    localStorage.setItem('access_token', 'jwt-de-la-version-anterior');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiUrlInterceptor, authInterceptor])), provideHttpClientTesting(),
        { provide: Router, useValue: { navigate, createUrlTree: (commands: string[]) => commands.join('') } },
        { provide: ToastService, useValue: toast },
        { provide: PushNotificationsService, useValue: push }],
    });
    http = TestBed.inject(HttpTestingController); client = TestBed.inject(HttpClient); auth = TestBed.inject(AuthService);
    vi.clearAllMocks();
  });
  afterEach(() => { vi.useRealTimers(); http.verify(); TestBed.resetTestingModule(); localStorage.clear(); sessionStorage.clear(); });
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
  it('usa cookie y CSRF con el proxy del mismo dominio en producción', async () => {
    await iniciar();
    const anterior = environment.apiUrl;
    environment.apiUrl = '/api';
    try {
      client.patch('/tareas/id', { titulo: 'Parcial' }).subscribe();
      const req = http.expectOne('/api/tareas/id');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('X-CSRF-Token')).toBe(session.csrfToken);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
      client.get(anterior + '/tareas').subscribe();
      const externo = http.expectOne(anterior + '/tareas');
      expect(externo.request.withCredentials).toBe(false);
      expect(externo.request.headers.has('X-CSRF-Token')).toBe(false);
      externo.flush({});
    } finally { environment.apiUrl = anterior; }
  });
  it('el login no guarda el JWT y comprueba que el navegador recibió la cookie', async () => {
    await iniciar();
    auth.login('seba@example.com', 'una frase segura').subscribe();
    http.expectOne(api + '/auth/login').flush({ mensaje: 'Sesión iniciada.' });
    http.expectOne(api + '/auth/session').flush(session);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });
  it('espera el arranque del servidor aunque tarde más de 15 segundos', async () => {
    vi.useFakeTimers();
    await Promise.resolve();
    const req = http.expectOne(api + '/auth/session');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(auth.checkingSession()).toBe(true);
    expect(auth.sessionError()).toBeNull();
    req.flush(session);
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('comparte la comprobación y recupera la sesión tras un fallo temporal', async () => {
    vi.useFakeTimers();
    await iniciar();
    const resultados: boolean[] = [];
    auth.ensureSession(true).subscribe((ok) => resultados.push(ok));
    auth.ensureSession(true).subscribe((ok) => resultados.push(ok));
    http.expectOne(api + '/auth/session').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.isAuthenticated()).toBe(true);
    await vi.advanceTimersByTimeAsync(1_500);
    http.expectOne(api + '/auth/session').flush(session);
    expect(resultados).toEqual([true, true]);
    expect(auth.sessionError()).toBeNull();
  });
  it('no borra una sesión comprobada por un fallo de conexión persistente', async () => {
    vi.useFakeTimers();
    await iniciar();
    const error = vi.fn();
    auth.ensureSession(true).subscribe({ error });
    http.expectOne(api + '/auth/session').error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(1_500);
    http.expectOne(api + '/auth/session').error(new ProgressEvent('error'));
    expect(error).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUserName()).toBe('Seba');
    expect(auth.csrfToken()).toBe(session.csrfToken);
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.sessionError()).toBeTruthy();
    expect(auth.checkingSession()).toBe(false);
  });
  it('permite reintentar el arranque sin mandar al usuario al login por una caída del servidor', async () => {
    vi.useFakeTimers();
    let resultado: unknown;
    (TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as any).subscribe((value: unknown) => resultado = value);
    await Promise.resolve();
    http.expectOne(api + '/auth/session').flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(1_500);
    http.expectOne(api + '/auth/session').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(resultado).toBe(false);
    expect(auth.sessionError()).toBeTruthy();
    auth.ensureSession().subscribe();
    http.expectOne(api + '/auth/session').flush(session);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.sessionError()).toBeNull();
  });
  it('no considera una contraseña actual incorrecta como una sesión vencida', async () => {
    await iniciar();
    const error = vi.fn();
    auth.cambiarPassword('incorrecta', 'una frase nueva segura').subscribe({ error });
    http.expectOne(api + '/auth/cambiar-password').flush({ message: 'La contraseña actual es incorrecta' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(api + '/auth/session').flush(session);
    expect(error).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('cierra una sesión si el servidor confirma que venció', async () => {
    await iniciar();
    client.get('/tareas').subscribe({ error: () => {} });
    http.expectOne(api + '/tareas').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(api + '/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.csrfToken()).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
  it('un 401 no cierra la sesión si la comprobación falla por un corte de red', async () => {
    vi.useFakeTimers();
    await iniciar();
    const error = vi.fn();
    client.get('/mensajes').subscribe({ error });
    http.expectOne(api + '/mensajes').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(api + '/auth/session').error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(1_500);
    http.expectOne(api + '/auth/session').error(new ProgressEvent('error'));
    expect(error).toHaveBeenCalled();
    expect(auth.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
  it('espera una comprobación pendiente antes del login para evitar carreras', async () => {
    await Promise.resolve();
    auth.login('seba@example.com', 'una frase segura').subscribe();
    http.expectNone(api + '/auth/login');
    http.expectOne(api + '/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(api + '/auth/login').flush({ mensaje: 'Sesión iniciada.' });
    http.expectOne(api + '/auth/session').flush(session);
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('una comprobación anterior al logout no vuelve a activar la sesión', async () => {
    await iniciar();
    auth.ensureSession(true).subscribe();
    const comprobacion = http.expectOne(api + '/auth/session');
    auth.logout();
    http.expectOne(api + '/auth/logout').flush({ mensaje: 'Sesiones cerradas.' });
    comprobacion.flush(session);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.csrfToken()).toBe('');
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
  it('elimina el dispositivo con cookie y CSRF antes de revocar la sesión', async () => {
    await iniciar();
    push.beforeLogout.mockImplementation(() => client.delete('/push/subscriptions', {
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/dispositivo' },
    }).pipe(map(() => undefined)));
    auth.logout();
    http.expectNone(api + '/auth/logout');
    const baja = http.expectOne(api + '/push/subscriptions');
    expect(baja.request.withCredentials).toBe(true);
    expect(baja.request.headers.get('X-CSRF-Token')).toBe('csrf-de-prueba');
    baja.flush({ mensaje: 'Desactivadas' });
    http.expectOne(api + '/auth/logout').flush({ mensaje: 'Sesiones cerradas.' });
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('si la baja push falla, conserva la sesión para poder reintentar', async () => {
    await iniciar();
    push.beforeLogout.mockImplementation(() => client.delete('/push/subscriptions', {
      body: { endpoint: 'https://fcm.googleapis.com/fcm/send/dispositivo' },
    }).pipe(map(() => undefined)));
    auth.logout();
    http.expectOne(api + '/push/subscriptions').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectNone(api + '/auth/logout');
    expect(auth.isAuthenticated()).toBe(true);
    expect(toast.error).toHaveBeenCalled();
  });
  it('la política de contraseña mide bytes Unicode, no solo caracteres', async () => {
    await iniciar();
    expect(passwordBytes(new FormControl('🔒'.repeat(20)))).toEqual({ passwordBytes: true });
    expect(passwordBytes(new FormControl('una frase segura de prueba'))).toBeNull();
  });
});
