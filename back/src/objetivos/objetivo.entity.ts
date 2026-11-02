import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('objetivos')
export class Objetivo {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 200 }) titulo!: string;
  @Column({ type: 'date' }) fecha!: string;
  @Column({ default: false }) completado!: boolean;
  @Column('uuid') usuarioId!: string;
  @Column({ type: 'uuid', nullable: true }) tareaId!: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) creadoEn!: Date;
}
