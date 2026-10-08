import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 2048, unique: true })
  endpoint!: string;

  @Column({ type: 'jsonb' })
  keys!: { p256dh: string; auth: string };

  @Index('push_subscriptions_usuario')
  @Column({ type: 'uuid' })
  usuarioId!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
