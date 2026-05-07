// auth.module.ts
import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard'; // 引入 AuthGuard
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthGuard], // 提供 AuthGuard 和 JwtService
  exports: [AuthGuard], // 导出 AuthGuard 使其他模块可用
})
export class AuthModule { }
