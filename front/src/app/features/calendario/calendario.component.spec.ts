import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { EstadoTarea, OrigenTarea, Tarea, TipoTarea } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { TareasService } from '../tareas/tareas.service';
import { CalendarioComponent } from './calendario.component';
import { TareaCalendarioDialogComponent } from './tarea-calendario-dialog.component';

registerLocaleData(localeEsAr);

describe('Edición de tareas desde el calendario', () => {
  let fixture: ComponentFixture<CalendarioComponent>;
  let service: { listarCalendario: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
  let tarea: Tarea;
  let dialog: any;

  const dialogPrototype = HTMLDialogElement.prototype;
  const originalShowModal = Object.getOwnPropertyDescriptor(dialogPrototype, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, 'close');
  beforeAll(() => {
    // jsdom does not implement native modal dialogs.
    Object.defineProperty(dialogPrototype, 'showModal', { configurable: true, writable: true,
      value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(dialogPrototype, 'close', { configurable: true, writable: true,
      value: function (this: HTMLDialogElement) { this.open = false; } });
  });
  afterAll(() => {
    if (originalShowModal) Object.defineProperty(dialogPrototype, 'showModal', originalShowModal);
    else delete (dialogPrototype as any).showModal;
    if (originalClose) Object.defineProperty(dialogPrototype, 'close', originalClose);
    else delete (dialogPrototype as any).close;
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12));
    tarea = {
      id: 'tarea-1', titulo: 'Entregar informe', descripcion: 'Capítulo 1', materia: null,
      tipo: TipoTarea.ENTREGA, estado: EstadoTarea.PENDIENTE,
      fechaLimite: '2026-10-07T00:00:32.000Z', recordatorioMinutos: 60,
      origen: OrigenTarea.MANUAL, fechaCreacion: '2026-10-01T00:00:00.000Z',
    };
    service = { listarCalendario: vi.fn().mockReturnValue(of([tarea])), actualizar: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CalendarioComponent],
      providers: [provideRouter([]), { provide: TareasService, useValue: service },
        { provide: ToastService, useValue: { success: vi.fn() } }],
    }).compileComponents();
    fixture = TestBed.createComponent(CalendarioComponent);
    (fixture.componentInstance as any).mesActual.set(new Date(2026, 9, 7));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.calendar-cell button').click();
    fixture.detectChanges();
    dialog = fixture.debugElement.query(By.directive(TareaCalendarioDialogComponent)).componentInstance;
  });

  afterEach(() => { fixture?.destroy(); TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.useRealTimers(); });

  function guardar() {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('abre la tarea presionada y guarda sus campos sin alterar la hora ni los recordatorios', () => {
    expect(dialog.form.getRawValue()).toMatchObject({ titulo: tarea.titulo, fechaLimite: '2026-10-07T00:00' });
    dialog.form.patchValue({ titulo: '  Informe final  ', descripcion: '', tipo: TipoTarea.TP, estado: EstadoTarea.EN_PROGRESO });
    const actualizada = { ...tarea, titulo: 'Informe final', descripcion: '', tipo: TipoTarea.TP, estado: EstadoTarea.EN_PROGRESO };
    service.actualizar.mockReturnValue(of(actualizada));
    service.listarCalendario.mockReturnValue(of([actualizada]));
    guardar();
    expect(service.actualizar).toHaveBeenCalledWith(tarea.id, {
      titulo: 'Informe final', descripcion: '', tipo: TipoTarea.TP, estado: EstadoTarea.EN_PROGRESO,
    });
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
    expect(fixture.nativeElement.querySelector('.calendar-cell button').textContent).toContain('Informe final');
  });

  it('marca como hecha y actualiza la celda y la lista de pendientes', () => {
    const actualizada = { ...tarea, estado: EstadoTarea.HECHA };
    service.actualizar.mockReturnValue(of(actualizada));
    service.listarCalendario.mockReturnValue(of([actualizada]));
    fixture.nativeElement.querySelector('.complete').click();
    fixture.detectChanges();
    expect(service.actualizar).toHaveBeenCalledWith(tarea.id, { estado: EstadoTarea.HECHA });
    expect(fixture.nativeElement.querySelector('.calendar-cell button').classList.contains('tarea-hecha')).toBe(true);
    expect(fixture.nativeElement.querySelector('.upcoming-title').textContent).toContain('0 pendientes');
    expect(fixture.nativeElement.querySelector('.upcoming-card')).toBeNull();
  });

  it('excluye fechas pasadas y tareas hechas, conserva hoy y ordena las próximas', () => {
    const component = fixture.componentInstance as any;
    dialog.cerrar();
    component.tareasMes.set([
      { ...tarea, id: 'futura', titulo: 'Mañana', fechaLimite: '2026-10-08T00:00:00.000Z' },
      { ...tarea, id: 'vencida', titulo: 'Ayer', fechaLimite: '2026-10-06T00:00:00.000Z' },
      { ...tarea, id: 'hecha', titulo: 'Completada', fechaLimite: '2026-10-09T00:00:00.000Z', estado: EstadoTarea.HECHA },
      { ...tarea, id: 'hoy', titulo: 'Hoy', fechaLimite: '2026-10-07T00:00:00.000Z', estado: EstadoTarea.EN_PROGRESO },
    ]);
    fixture.detectChanges();
    expect(component.tareasPendientes().map((t: Tarea) => t.id)).toEqual(['hoy', 'futura']);
    expect(fixture.nativeElement.querySelector('.upcoming-title').textContent).toContain('2 pendientes');
    expect(fixture.nativeElement.querySelectorAll('.upcoming-section .upcoming-card')).toHaveLength(2);
    expect(component.tareasVencidas().map((t: Tarea) => t.id)).toEqual(['vencida']);
    expect(fixture.nativeElement.querySelector('.overdue-section .upcoming-title').textContent).toContain('1 pendientes');
    expect(fixture.nativeElement.querySelectorAll('.overdue-card')).toHaveLength(1);
    expect(component.tareasDelMes()).toHaveLength(4);
  });

  it('quita las fechas de ayer al cambiar de día sin recargar la página', () => {
    const component = fixture.componentInstance as any;
    expect(component.tareasPendientes()).toHaveLength(1);
    vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 30));
    vi.advanceTimersByTime(60_000);
    fixture.detectChanges();
    expect(component.tareasPendientes()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.upcoming-section .upcoming-card')).toBeNull();
    expect(component.tareasVencidas()).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.overdue-card')).toHaveLength(1);
    expect(component.tareasDelMes()).toHaveLength(1);
  });

  it('mueve la tarea de día y la quita del período cuando pasa al mes siguiente', () => {
    dialog.form.patchValue({ fechaLimite: '2026-11-03T14:30' });
    service.actualizar.mockReturnValue(of({ ...tarea, fechaLimite: '2026-11-03T14:30:00.000Z' }));
    service.listarCalendario.mockReturnValue(of([]));
    guardar();
    expect(service.actualizar.mock.calls[0][1].fechaLimite).toBe('2026-11-03T14:30:00.000Z');
    expect(service.listarCalendario).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.calendar-cell button')).toBeNull();
    (fixture.componentInstance as any).periodoSiguiente();
    expect(service.listarCalendario.mock.lastCall?.[0].toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('abre una tarea vencida y la quita del panel al marcarla como hecha', () => {
    const component = fixture.componentInstance as any;
    dialog.cerrar();
    const vencida = { ...tarea, fechaLimite: '2026-10-05T00:00:00.000Z' };
    component.tareasMes.set([vencida]); fixture.detectChanges();
    fixture.nativeElement.querySelector('.overdue-card').click(); fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(TareaCalendarioDialogComponent)).componentInstance as any;
    expect(editor.tarea().id).toBe(vencida.id);
    const hecha = { ...vencida, estado: EstadoTarea.HECHA };
    service.actualizar.mockReturnValue(of(hecha));
    service.listarCalendario.mockReturnValue(of([hecha]));
    fixture.nativeElement.querySelector('.complete').click(); fixture.detectChanges();
    expect(service.actualizar).toHaveBeenCalledWith(vencida.id, { estado: EstadoTarea.HECHA });
    expect(fixture.nativeElement.querySelector('.overdue-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.overdue-section').textContent).toContain('No hay tareas vencidas pendientes.');
  });

  it('rechaza títulos vacíos y fechas vacías antes de guardar', () => {
    dialog.form.patchValue({ titulo: '   ' }); guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
    dialog.form.patchValue({ titulo: 'Informe', fechaLimite: '' }); guardar();
    expect(service.actualizar).not.toHaveBeenCalled();
  });

  it('conserva los cambios si falla el guardado y permite reintentar', () => {
    dialog.form.patchValue({ titulo: 'Informe corregido' });
    service.actualizar.mockReturnValue(throwError(() => new Error('Sin conexión')));
    guardar();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Conservamos tus cambios');
    expect(dialog.form.controls.titulo.value).toBe('Informe corregido');
    expect(dialog.guardando()).toBe(false);
    expect(service.listarCalendario).toHaveBeenCalledTimes(1);
    service.actualizar.mockReturnValue(of({ ...tarea, titulo: 'Informe corregido' }));
    guardar();
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  });

  it('evita envíos duplicados y cerrar mientras guarda; cancelar no modifica la tarea', () => {
    const respuesta = new Subject<Tarea>();
    service.actualizar.mockReturnValue(respuesta);
    guardar(); dialog.guardar(); dialog.marcarHecha(); dialog.cerrar();
    expect(service.actualizar).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    respuesta.error(new Error('Sin conexión')); fixture.detectChanges();
    fixture.nativeElement.querySelector('.close-button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
    expect(service.actualizar).toHaveBeenCalledTimes(1);
  });
});
