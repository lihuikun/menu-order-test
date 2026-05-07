import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailLoginDto {
    @ApiProperty({ description: '用户邮箱' })
    @IsEmail({}, { message: '请输入有效的邮箱地址' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string;

    @ApiProperty({ description: '用户密码' })
    @IsString({ message: '密码必须是字符串' })
    @IsNotEmpty({ message: '密码不能为空' })
    password: string;

    @ApiProperty({ description: '团队邀请短链code', required: false })
    @IsOptional()
    @IsString()
    inviteCode?: string;
}