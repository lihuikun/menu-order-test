import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateGithubLoginDto {
    @ApiProperty({ description: 'GitHub授权码' })
    @IsString()
    @IsNotEmpty()
    code: string;
    @ApiProperty({ description: 'GitHub应用类型', default: 'default' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ description: '团队邀请短链code', required: false })
    @IsOptional()
    @IsString()
    inviteCode?: string;
}

