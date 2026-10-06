import { TestBed, ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { ImportarPlanComponent } from './importar-plan.component';
import { MateriasService } from './materias.service';
import { PdfPlanService, textoDePagina } from './pdf-plan.service';
import { Cuatrimestre, EstadoMateria } from '../../core/models';

describe('Importar plan: revisión y confirmación antes de crear materias', () => {
  let fixture: ComponentFixture<ImportarPlanComponent>; let component: any;
  const primera = { nombre: 'Análisis Matemático I', anioCursado: 1, cuatrimestre: Cuatrimestre.PRIMERO, existe: false };
  const segunda = { nombre: 'Física I', anioCursado: 1, cuatrimestre: Cuatrimestre.ANUAL, existe: false };
  let servicio: any; let pdf: any;
  beforeEach(async () => {
    servicio = { analizarPlan: vi.fn().mockReturnValue(of({ materias: [primera, segunda], advertencias: [] })),
      importarPlan: vi.fn().mockReturnValue(of({ creadas: [{ ...segunda, id: 'nueva', estado: EstadoMateria.REGULAR }], omitidas: [] })) };
    pdf = { leer: vi.fn().mockResolvedValue('Primer año: Análisis Matemático I y Física I, materia anual.') };
    await TestBed.configureTestingModule({ imports: [ImportarPlanComponent], providers: [
      { provide: MateriasService, useValue: servicio }, { provide: PdfPlanService, useValue: pdf },
    ] }).compileComponents();
    fixture = TestBed.createComponent(ImportarPlanComponent); component = fixture.componentInstance;
    fixture.componentRef.setInput('materiasExistentes', []); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); TestBed.resetTestingModule(); });
  async function analizar() { component.archivo.set(new File(['%PDF-fake'], 'plan.pdf', { type: 'application/pdf' })); await component.analizar(); fixture.detectChanges(); }
  it('la extracción muestra datos editables y no crea nada hasta confirmar', async () => {
    await analizar();
    expect(pdf.leer).toHaveBeenCalled(); expect(servicio.analizarPlan).toHaveBeenCalled();
    expect(servicio.importarPlan).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Revisá las materias detectadas');
    expect(component.seleccionadas()).toHaveLength(2);
    component.editar(1, { anioCursado: 2, cuatrimestre: Cuatrimestre.SEGUNDO });
    component.guardar();
    expect(servicio.importarPlan).toHaveBeenCalledWith([
      { nombre: primera.nombre, anioCursado: 1, cuatrimestre: Cuatrimestre.PRIMERO },
      { nombre: segunda.nombre, anioCursado: 2, cuatrimestre: Cuatrimestre.SEGUNDO },
    ]);
  });
  it('omite coincidencias y repeticiones sin confundir los niveles I/II', async () => {
    fixture.componentRef.setInput('materiasExistentes', [{ nombre: 'ANALISIS MATEMATICO I' }]);
    servicio.analizarPlan.mockReturnValue(of({ materias: [primera, segunda,
      { ...segunda, nombre: '  FISICA   I ' }, { ...primera, nombre: 'Análisis Matemático II' }], advertencias: [] }));
    await analizar();
    expect(component.seleccionadas().map((m: any) => m.nombre)).toEqual(['Física I', 'Análisis Matemático II']);
    expect(component.omitidas()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Ya cargada');
    expect(fixture.nativeElement.textContent).toContain('Repetida en el plan');
  });
  it('los cambios de nombre recalculan los duplicados y los errores bloquean guardar', async () => {
    await analizar(); component.editar(1, { nombre: primera.nombre });
    expect(component.seleccionadas()).toHaveLength(1);
    component.editar(1, { nombre: 'Física II', anioCursado: 2026 });
    component.guardar(); expect(servicio.importarPlan).not.toHaveBeenCalled();
    component.editar(1, { anioCursado: null });
    expect(component.seleccionadas()[1].anioCursado).toBeNull();
  });
  it('permite excluir materias y conserva la revisión si falla el guardado', async () => {
    await analizar(); component.editar(0, { seleccionada: false });
    servicio.importarPlan.mockReturnValue(throwError(() => ({ status: 503 })));
    component.guardar();
    expect(servicio.importarPlan.mock.calls[0][0]).toHaveLength(1);
    expect(component.filas()).toHaveLength(2); expect(component.guardando()).toBe(false);
    expect(component.error()).toContain('Conservamos');
  });
  it('no envía otra importación mientras está guardando y emite las materias creadas', async () => {
    await analizar();
    const request = new Subject<any>(); servicio.importarPlan.mockReturnValue(request);
    const emit = vi.spyOn(fixture.componentInstance.importado, 'emit');
    component.guardar(); component.guardar(); expect(servicio.importarPlan).toHaveBeenCalledTimes(1);
    request.next({ creadas: [], omitidas: ['Física I'] }); request.complete();
    expect(emit).toHaveBeenCalledWith([]); expect(component.resultado().omitidas).toEqual(['Física I']);
  });
  it('cancelar un análisis impide que una respuesta vieja reabra la vista previa', async () => {
    const request = new Subject<any>(); servicio.analizarPlan.mockReturnValue(request);
    await analizar(); component.cancelar();
    request.next({ materias: [primera], advertencias: [] });
    expect(component.filas()).toHaveLength(0); expect(component.procesando()).toBe(false);
    expect(servicio.importarPlan).not.toHaveBeenCalled();
  });
  it('un PDF ilegible no llega a la IA y permite reintentar', async () => {
    pdf.leer.mockRejectedValueOnce(new Error('No hay texto seleccionable.'));
    await analizar(); expect(servicio.analizarPlan).not.toHaveBeenCalled();
    expect(component.error()).toContain('seleccionable'); expect(component.procesando()).toBe(false);
    await component.analizar(); expect(component.filas()).toHaveLength(2);
  });
  it('también acepta texto pegado y mantiene las advertencias de la IA', async () => {
    component.cambiarModo('texto'); component.texto.set('Primer año: Física I. Sin período especificado.');
    servicio.analizarPlan.mockReturnValue(of({ materias: [{ ...segunda, cuatrimestre: null }], advertencias: ['No figura el período de Física I.'] }));
    await component.analizar(); fixture.detectChanges();
    expect(pdf.leer).not.toHaveBeenCalled(); expect(component.seleccionadas()[0].cuatrimestre).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No figura el período');
  });
});

describe('Texto de tablas del PDF', () => {
  it('conserva las filas y columnas aunque el PDF entregue los fragmentos desordenados', () => {
    const fragmento = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
    expect(textoDePagina([fragmento('Anual', 300, 80), fragmento('Primer año', 10, 100),
      fragmento('Física I', 10, 81), fragmento('1.er cuatrimestre', 300, 60), fragmento('Álgebra I', 10, 60)]))
      .toBe('Primer año\nFísica I Anual\nÁlgebra I 1.er cuatrimestre');
  });
});
