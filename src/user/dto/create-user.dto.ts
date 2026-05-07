import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class CreateUserDto {
  @ApiProperty({ description: '用户昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: '用户头像 URL', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
