import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum LoginType {
  EMAIL = 'email',
  GITHUB = 'github'
}

export enum Role {
  ADMIN = 'admin',
  SUBADMIN = 'subAdmin',
  USER = 'user'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  nickname?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email?: string; // 邮箱登录用户的唯一标识

  @Column({ type: 'varchar', nullable: true })
  password?: string; // 邮箱登录用户的密码

  @Column({ type: 'enum', enum: LoginType, nullable: false })
  loginType: LoginType; // 用户登录类型

  // token
  @Column({ type: 'varchar', nullable: true })
  token?: string;

  // 团队ID：默认注册时等于自己的用户ID，接受邀请后会切换为目标团队ID
  @Index()
  @Column({ type: 'int', nullable: true })
  teamId?: number;

  // 角色,默认用户
  @Column({ type: 'enum', enum: Role, default: Role.USER, nullable: false })
  role: Role;

  // 会员状态
  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createTime?: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedTime?: Date;
}
