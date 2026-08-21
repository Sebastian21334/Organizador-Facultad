import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tarea } from '../../tareas/entities/tarea.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum FuenteMensaje {
  WHATSAPP = 'whatsapp',
  CHAT_APP = 'chat_app',
}

@Entity('mensajes_entrantes')
export class MensajeEntrante {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  textoOriginal!: string;

  @Column({ type: 'enum', enum: FuenteMensaje })
  fuente!: FuenteMensaje;

  @Column({ type: 'boolean', default: false })
  procesado!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  resultadoIA?: Record<string, any>;

  @ManyToOne(() => Tarea, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tarea_generada_id' })
  tareaGenerada?: Tarea;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column()
  usuarioId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaRecibido!: Date;
}