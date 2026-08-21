import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export interface ResultadoExtraccionTarea {
  titulo: string;
  descripcion: string | null;
  materia: string | null;
  fecha: string | null;
  tipo: 'tarea' | 'examen' | 'entrega' | 'tp' | 'otro';
  confianza: number;
  aclaracion: string | null;
}

@Injectable()
export class IaService {
  private readonly client: OpenAI;
  private readonly deployment: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('AZURE_OPENAI_API_KEY'),
      baseURL: this.config.get('AZURE_OPENAI_ENDPOINT'), // .../openai/v1
    });
    this.deployment = this.config.get('AZURE_OPENAI_DEPLOYMENT')!;
  }

  /**
   * @param texto Mensaje original del estudiante.
   * @param materiasExistentes Nombres de las materias que el estudiante ya tiene cargadas.
   *   Se le pasan a la IA para que, si el mensaje se refiere a una de ellas (aunque esté
   *   escrita distinto, abreviada o mal tipeada), devuelva el nombre EXACTO tal como está
   *   guardado, en vez de inventar una variante nueva.
   */
  async extraerTarea(texto: string, materiasExistentes: string[] = []): Promise<ResultadoExtraccionTarea> {
    const hoy = new Date().toISOString().split('T')[0];

    const contextoMaterias = materiasExistentes.length
      ? `\n\nEl estudiante ya tiene cargadas estas materias exactamente con estos nombres: ${materiasExistentes
          .map((m) => `"${m}"`)
          .join(', ')}.
        Si el mensaje se refiere a alguna de ellas (aunque la escriba abreviada, con errores de tipeo, sin tildes, o con otro orden de palabras), devolvé el nombre EXACTO tal como figura en esa lista, sin modificarlo.
        Si el me  nsaje menciona una materia que claramente no está en esa lista, devolvé el nombre tal como lo interpretás, prolijo y con mayúscula inicial en cada palabra relevante.`
      : '';

    const response = await this.client.responses.create({
      model: this.deployment, // en Azure, "model" es el nombre del deployment
      input: `Hoy es ${hoy} (${new Date(hoy).toLocaleDateString('es-AR', { weekday: 'long' })}).
      Extraé de este mensaje de un estudiante los datos de una tarea universitaria, interpretando fechas relativas
      como "el miércoles", "el jueves que viene", "mañana", etc. en base a la fecha de hoy.
      No infieras ni extraigas el año de cursado, el cuatrimestre ni el estado académico de ninguna materia:
      esos datos los carga y actualiza manualmente el estudiante.${contextoMaterias}

        Evaluá qué tan segura estás de haber entendido bien el mensaje (título, tipo de tarea, fecha y materia).
        El valor de confianza va de 0 a 1. Bajalo si el mensaje es ambiguo, incompleto, o si no reconocés
        claramente la materia entre las cargadas.
        Si tu confianza es menor a 0.5, escribí en el campo "aclaracion" una respuesta corta, natural y en tono
        de chat (como si le estuvieras respondiendo directo al estudiante, no un mensaje de error genérico),
        pidiéndole que reformule o agregue el detalle que te falta. Sé específica sobre qué no te quedó claro 
        (ej: "¿A qué materia te referís con eso?" o "¿Para cuándo es? no me quedó claro en tu mensaje").
        Si tu confianza es 0.5 o más, dejá "aclaracion" en null.

      Mensaje: "${texto}"`,
      text: {
        format: {
          type: 'json_schema',
          name: 'extraccion_tarea',
          schema: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              descripcion: {
                type: ['string', 'null'],
                description: 'Detalles adicionales del mensaje: temas, contenidos, aclaraciones. Null si no hay nada más allá del título.',
              },
              materia: { type: ['string', 'null'] },
              fecha: { type: ['string', 'null'], description: 'Formato ISO YYYY-MM-DD' },
              tipo: { type: 'string', enum: ['tarea', 'examen', 'entrega', 'tp', 'otro'] },
              confianza: { type: 'number' },
              aclaracion: {
                  type: ['string', 'null'],
                  description: 'Respuesta conversacional pidiendo aclaración, solo si confianza < 0.5. Null en caso contrario.',
              },
            },
            required: ['titulo', 'descripcion', 'materia', 'fecha', 'tipo', 'confianza', 'aclaracion'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    if (!response.output_text) {
      throw new Error('La IA no devolvió una respuesta válida para este mensaje');
    }

    return JSON.parse(response.output_text) as ResultadoExtraccionTarea;
  }
}