import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Materia } from '../../materias/entities/materia.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string; // hash, nunca texto plano

  @Column({ nullable: true })
  nombre!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Materia, (materia) => materia.usuario)
  materias!: Materia[];

  @OneToMany(() => Tarea, (tarea) => tarea.usuario)
  tareas!: Tarea[];

  @Column({ default: false })
  emailVerificado!: boolean;

  @Column({ type: 'integer', default: 0 })
  sessionVersion!: number;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  verificationTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  verificationTokenExpires!: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  resetTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  resetTokenExpires!: Date | null;

  @Column({ default: false })
  recordatorioEmailHabilitado!: boolean;

  @Column({ type: 'integer', nullable: true })
  recordatorioMinutos!: number | null;
}
