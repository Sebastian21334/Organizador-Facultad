import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

export enum Cuatrimestre {
  PRIMERO = '1',
  SEGUNDO = '2',
  ANUAL = 'anual',
}

export enum EstadoMateria {
  REGULAR = 'regular',
  APROBADO = 'aprobado',
  LIBRE = 'libre',
}

@Entity('materias')
export class Materia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'int', nullable: true })
  anioCursado?: number;

  @Column({ type: 'enum', enum: Cuatrimestre, nullable: true })
  cuatrimestre?: Cuatrimestre;

  @Column({ type: 'enum', enum: EstadoMateria, default: EstadoMateria.REGULAR })
  estado!: EstadoMateria;

  @ManyToOne(() => Usuario, (usuario) => usuario.materias)
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column()
  usuarioId!: string;

}