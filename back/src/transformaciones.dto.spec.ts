import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './auth/dto/login.dto';
import { RegisterDto } from './auth/dto/register.dto';
import { ForgotPasswordDto } from './auth/dto/forgot-password.dto';
import { CrearMateriaDto } from './materias/dto/crear-materia.dto';
import { ActualizarMateriaDto } from './materias/dto/actualizar-materia.dto';
import {
  AnalizarPlanDto,
  MateriaPlanDto,
} from './materias/dto/plan-estudios.dto';
import { CrearMensajeDto } from './mensajes/dto/crear-mensaje.dto';
import { CrearTareaDto } from './tareas/dto/crear-tarea.dto';
import { PaginacionDto } from './paginacion.dto';

describe('DTO: los valores unknown conservan la transformación y validación', () => {
  const casos: {
    dto: ClassConstructor<object>;
    campo: string;
    valor: string;
    esperado: string | number;
  }[] = [
    {
      dto: LoginDto,
      campo: 'email',
      valor: ' PERSONA@EXAMPLE.TEST ',
      esperado: 'persona@example.test',
    },
    {
      dto: RegisterDto,
      campo: 'nombre',
      valor: ' Persona ',
      esperado: 'Persona',
    },
    {
      dto: ForgotPasswordDto,
      campo: 'email',
      valor: ' PERSONA@EXAMPLE.TEST ',
      esperado: 'persona@example.test',
    },
    {
      dto: CrearMateriaDto,
      campo: 'nombre',
      valor: ' Análisis ',
      esperado: 'Análisis',
    },
    {
      dto: ActualizarMateriaDto,
      campo: 'nombre',
      valor: ' Análisis ',
      esperado: 'Análisis',
    },
    {
      dto: AnalizarPlanDto,
      campo: 'texto',
      valor: ' Un plan de estudios con suficiente texto ',
      esperado: 'Un plan de estudios con suficiente texto',
    },
    {
      dto: MateriaPlanDto,
      campo: 'nombre',
      valor: ' Análisis ',
      esperado: 'Análisis',
    },
    {
      dto: CrearMensajeDto,
      campo: 'texto',
      valor: ' Mi tarea ',
      esperado: 'Mi tarea',
    },
    {
      dto: CrearTareaDto,
      campo: 'titulo',
      valor: ' Mi tarea ',
      esperado: 'Mi tarea',
    },
    { dto: PaginacionDto, campo: 'limit', valor: '20', esperado: 20 },
  ];

  it.each(casos)(
    '$dto.name.$campo transforma cadenas y sigue rechazando objetos',
    ({ dto, campo, valor, esperado }) => {
      const valido = plainToInstance(dto, { [campo]: valor });
      expect(Reflect.get(valido, campo)).toBe(esperado);
      expect(
        validateSync(valido).filter((error) => error.property === campo),
      ).toHaveLength(0);
      const invalido = plainToInstance(dto, { [campo]: { valor: 'invalido' } });
      expect(
        validateSync(invalido).some((error) => error.property === campo),
      ).toBe(true);
    },
  );
});
