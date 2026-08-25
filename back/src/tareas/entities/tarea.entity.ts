import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Materia } from '../../materias/entities/materia.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoTarea {
  TAREA = 'tarea',
  EXAMEN = 'examen',
  ENTREGA = 'entrega',
  TP = 'tp',
  OTRO = 'otro',
}

export enum EstadoTarea {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  HECHA = 'hecha',
}

export enum OrigenTarea {
  MANUAL = 'manual',
  WHATSAPP = 'whatsapp',
  IA_CHAT = 'ia_chat',
}

@Entity('tareas')
export class Tarea {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'varchar', length: 200 })
  titulo?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @ManyToOne(() => Materia, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'materia_id' })
  materia?: Materia;

  @Column({ type: 'enum', enum: TipoTarea, default: TipoTarea.TAREA })
  tipo?: TipoTarea;

  @Column({ type: 'enum', enum: EstadoTarea, default: EstadoTarea.PENDIENTE })
  estado?: EstadoTarea;

  @Column({ type: 'timestamptz', nullable: true })
  fechaLimite?: Date;

  @Column({ type: 'enum', enum: OrigenTarea, default: OrigenTarea.MANUAL })
  origen?: OrigenTarea;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaCreacion?: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.tareas)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column()
  usuarioId!: string;
    
}