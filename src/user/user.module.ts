import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { VerificationModule } from '../verification/verification.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    VerificationModule,
    TeamModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule { }
