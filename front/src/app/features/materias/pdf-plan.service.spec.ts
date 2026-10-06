import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PdfPlanService } from './pdf-plan.service';

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument, GlobalWorkerOptions: { workerSrc: '' } }));

describe('Lectura del PDF antes de enviar el texto a IA', () => {
  let service: PdfPlanService; let documento: any; let destroy: any;
  const archivo = (data = '%PDF-1.7 documento de prueba', extras: Record<string, unknown> = {}) => ({
    name: 'plan.pdf', type: 'application/pdf', size: data.length,
    arrayBuffer: async () => new TextEncoder().encode(data).buffer,
    ...extras,
  }) as unknown as File;
  const pagina = (str: string) => ({
    getTextContent: async () => ({ items: [{ str, transform: [1, 0, 0, 1, 10, 100] }] }), cleanup: vi.fn(),
  });
  beforeEach(() => {
    service = new PdfPlanService(); destroy = vi.fn().mockResolvedValue(undefined);
    documento = { numPages: 2, getPage: vi.fn(async n => pagina(n === 1 ? 'Primer año: Álgebra I, primer cuatrimestre.' : 'Segundo año: Física II, anual.')) };
    getDocument.mockReset().mockImplementation(() => ({ promise: Promise.resolve(documento), destroy }));
  });
  it('lee todas las páginas, conserva encabezados y libera el lector', async () => {
    const progreso = vi.fn();
    const texto = await service.leer(archivo(), progreso);
    expect(texto).toContain('[Página 1]\nPrimer año: Álgebra I');
    expect(texto).toContain('[Página 2]\nSegundo año: Física II');
    expect(progreso).toHaveBeenCalledTimes(2); expect(destroy).toHaveBeenCalled();
  });
  it.each([
    archivo('no es un PDF'), archivo(undefined, { name: 'plan.png', type: 'image/png' }),
    archivo(undefined, { size: 11 * 1024 * 1024 }), archivo(undefined, { size: 0 }),
  ])('rechaza archivos inválidos antes de abrir el lector: %#', async file => {
    await expect(service.leer(file)).rejects.toThrow(); expect(getDocument).not.toHaveBeenCalled();
  });
  it('rechaza PDFs escaneados o mixtos sin enviar un plan parcial', async () => {
    documento.getPage.mockImplementation(async (n: number) => pagina(n === 1 ? 'Primer año: Álgebra I, primer cuatrimestre.' : ''));
    await expect(service.leer(archivo())).rejects.toThrow('página 2');
    expect(destroy).toHaveBeenCalled();
  });
  it('rechaza PDFs demasiado largos sin recortar su contenido', async () => {
    documento.numPages = 51;
    await expect(service.leer(archivo())).rejects.toThrow('50 páginas');
    documento.numPages = 1; documento.getPage.mockResolvedValue(pagina('x'.repeat(60_001)));
    await expect(service.leer(archivo())).rejects.toThrow('demasiado texto');
  });
  it('explica cómo continuar si el archivo está protegido con contraseña', async () => {
    const error = new Error('password'); error.name = 'PasswordException';
    getDocument.mockReturnValue({ promise: Promise.reject(error), destroy });
    await expect(service.leer(archivo())).rejects.toThrow('sin contraseña');
    expect(destroy).toHaveBeenCalled();
  });
});
