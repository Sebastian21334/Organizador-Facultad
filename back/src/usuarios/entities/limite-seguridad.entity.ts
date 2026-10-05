import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('limites_seguridad')
export class LimiteSeguridad {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  clave!: string;

  @Column({ type: 'integer' })
  cantidad!: number;

  @Index()
  @Column({ type: 'timestamptz' })
  vence!: Date;
}
