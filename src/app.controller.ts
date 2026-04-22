import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('菜单模块')
@Controller('menu')
export class AppController {
  @Get('random')
  @ApiOperation({ summary: '随机推荐一个吃的' })
  getRandomMenu() {
    return '麻辣烫';
  }
}
