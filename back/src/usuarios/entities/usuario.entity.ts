import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
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
}