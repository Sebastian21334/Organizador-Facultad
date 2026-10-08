import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { EstadoTarea, OrigenTarea, Tarea, TipoTarea } from '../../core/models';
import { MateriasService } from '../materias/materias.service';
import { TareasService } from '../tareas/tareas.service';
import { InicioComponent } from './inicio.component';

registerLocaleData(localeEsAr);

describe('Agenda semanal de Inicio', () => {
  let fixture: ComponentFixture<InicioComponent>;
  const tituloLargo = 'Segunda entrega del trabajo práctico de programación con toda la documentación';

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 12));
    const base: Tarea = { id: 'hoy', titulo: tituloLargo, descripcion: 'Detalle de la entrega', materia: null,
      tipo: TipoTarea.TP, estado: EstadoTarea.PENDIENTE, fechaLimite: '2026-10-08T00:00:00.000Z',
      recordatorioMinutos: null, origen: OrigenTarea.MANUAL, fechaCreacion: '2026-10-01T00:00:00.000Z' };
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [provideRouter([]),
        { provide: AuthService, useValue: { currentUserName: () => 'Seba' } },
        { provide: MateriasService, useValue: { listar: () => of([]) } },
        { provide: TareasService, useValue: { listar: () => of([base,
          { ...base, id: 'manana', titulo: 'Parcial teórico', fechaLimite: '2026-10-09T00:00:00.000Z' },
          { ...base, id: 'hecha', titulo: 'Lectura terminada', estado: EstadoTarea.HECHA }]) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InicioComponent); fixture.detectChanges();
  });

  afterEach(() => { fixture?.destroy(); TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('selecciona hoy usando el día UTC de la tarea, muestra el título completo y cuenta solo pendientes', () => {
    const overview = fixture.nativeElement.querySelector('.weekly-overview');
    expect(overview.querySelector('.weekly-summary').textContent).toContain('2 tareas pendientes');
    expect(overview.querySelector('[aria-pressed="true"]').textContent).toContain('8');
    expect(overview.querySelector('app-agenda-dia').textContent).toContain(tituloLargo);
    expect(overview.querySelector('app-agenda-dia').textContent).toContain('Hecha');
    overview.querySelector('.day-task').click(); fixture.detectChanges();
    expect((fixture.componentInstance as any).tareaSeleccionada().id).toBe('hoy');
  });

  it('cambia la lista al elegir otro día y muestra los días sin tareas', () => {
    const dias = fixture.nativeElement.querySelectorAll('.weekly-day');
    dias[4].click(); fixture.detectChanges();
    const agenda = fixture.nativeElement.querySelector('#weekly-day-agenda');
    expect(agenda.textContent).toContain('Parcial teórico');
    expect(agenda.textContent).not.toContain(tituloLargo);
    dias[5].click(); fixture.detectChanges();
    expect(agenda.textContent).toContain('No hay tareas para este día.');
    expect(fixture.nativeElement.querySelector('.weekly-footer-link').getAttribute('href')).toBe('/calendario');
  });
});
