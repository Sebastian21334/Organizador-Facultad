import { Injectable } from '@angular/core';
import { MAX_TEXTO_PLAN } from './plan-estudios.model';

interface FragmentoPdf { str: string; transform: number[]; }

export function textoDePagina(items: FragmentoPdf[]): string {
  // Mantiene las filas de las tablas y el orden de sus columnas.
  const filas: { y: number; items: FragmentoPdf[] }[] = [];
  for (const item of [...items].sort((a, b) => b.transform[5] - a.transform[5])) {
    if (!item.str.trim()) continue;
    let fila = filas.find(f => Math.abs(f.y - item.transform[5]) < 3);
    if (!fila) { fila = { y: item.transform[5], items: [] }; filas.push(fila); }
    fila.items.push(item);
  }
  return filas.map(f => f.items.sort((a, b) => a.transform[4] - b.transform[4])
    .map(i => i.str).join(' ').trim()).join('\n');
}

@Injectable({ providedIn: 'root' })
export class PdfPlanService {
  async leer(archivo: File, progreso: (mensaje: string) => void = () => {}): Promise<string> {
    if (!/\.pdf$/i.test(archivo.name) || (archivo.type && archivo.type !== 'application/pdf'))
      throw new Error('Elegí un archivo PDF. También podés pegar el texto de tu plan.');
    if (!archivo.size || archivo.size > 10 * 1024 * 1024)
      throw new Error('El PDF debe tener contenido y pesar hasta 10 MB.');
    const data = new Uint8Array(await archivo.arrayBuffer());
    if (!new TextDecoder().decode(data.subarray(0, 1024)).includes('%PDF-'))
      throw new Error('El archivo no parece ser un PDF válido.');
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    const tarea = pdfjs.getDocument({
      data, stopAtErrors: true, disableFontFace: true, useWasm: false,
      cMapUrl: new URL('pdfjs/cmaps/', document.baseURI).href,
      standardFontDataUrl: new URL('pdfjs/standard_fonts/', document.baseURI).href,
    });
    try {
      const documento = await tarea.promise;
      if (documento.numPages > 50) throw new Error('Elegí un PDF de hasta 50 páginas con el plan de tu carrera.');
      const paginas: string[] = [];
      let cantidad = 0;
      for (let n = 1; n <= documento.numPages; n++) {
        progreso(`Leyendo página ${n} de ${documento.numPages}…`);
        const pagina = await documento.getPage(n);
        const contenido = await pagina.getTextContent();
        const texto = textoDePagina(contenido.items.filter((i): i is FragmentoPdf & typeof i => 'str' in i));
        if (!texto.trim()) throw new Error(`La página ${n} no tiene texto seleccionable. Esta versión no lee páginas escaneadas; pegá el texto del plan o elegí otro PDF.`);
        const bloque = `[Página ${n}]\n${texto}`;
        cantidad += bloque.length + 2;
        if (cantidad > MAX_TEXTO_PLAN) throw new Error('El plan tiene demasiado texto. Elegí solo las páginas del plan de estudios (hasta 60000 caracteres).');
        paginas.push(bloque);
        pagina.cleanup();
      }
      const texto = paginas.join('\n\n').trim();
      if (texto.length < 20) throw new Error('No encontramos suficiente texto para leer el plan. Probá con otro PDF.');
      return texto;
    } catch (error) {
      if ((error as { name?: string }).name === 'PasswordException')
        throw new Error('El PDF tiene contraseña. Usá una copia sin contraseña o pegá el texto del plan.');
      if ((error as { name?: string }).name === 'InvalidPDFException')
        throw new Error('No pudimos abrir ese PDF. Probá con otra copia del documento.');
      throw error;
    } finally { await tarea.destroy(); }
  }
}
