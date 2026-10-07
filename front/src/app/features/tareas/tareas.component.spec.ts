import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { EstadoTarea, OrigenTarea, Tarea, TipoTarea } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog.service';
import { MateriasService } from '../materias/materias.service';
import { TareasComponent } from './tareas.component';
import { TareasService } from './tareas.service';

describe('Fechas de tareas consistentes con el calendario', () => {
  it('muestra el día guardado a medianoche UTC y el mismo día al editar', async () => {
    const tarea: Tarea = {
      id: 'parcial', titulo: 'Parcial práctico', descripcion: null, materia: null,
      tipo: TipoTarea.EXAMEN, estado: EstadoTarea.PENDIENTE,
      fechaLimite: '2026-10-08T00:00:00.000Z', recordatorioMinutos: null,
      origen: OrigenTarea.IA_CHAT, fechaCreacion: '2026-10-01T00:00:00.000Z',
    };
    await TestBed.configureTestingModule({
      imports: [TareasComponent],
      providers: [provideRouter([]),
        { provide: TareasService, useValue: { listar: vi.fn().mockReturnValue(of([tarea])) } },
        { provide: MateriasService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: AuthService, useValue: { getPerfil: vi.fn().mockReturnValue(of({ recordatorioEmailHabilitado: true })) } },
        { provide: ConfirmDialogService, useValue: {} },
        { provide: ToastService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TareasComponent);
    try {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('08/10/2026');
      expect(fixture.nativeElement.textContent).not.toContain('07/10/2026');
      const editar = Array.from(fixture.nativeElement.querySelectorAll('button'))
        .find((button: any) => button.textContent.trim() === 'Editar') as HTMLButtonElement;
      editar.click(); fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('input[type="date"]').value).toBe('2026-10-08');
    } finally { fixture.destroy(); TestBed.resetTestingModule(); }
  });
});
