import { PartialType } from '@nestjs/mapped-types';
import { CrearTareaDto } from './crear-tarea.dto';

export class ActualizarTareaDto extends PartialType(CrearTareaDto, {
  skipNullProperties: false,
}) {}
