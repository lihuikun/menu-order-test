import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pv } from '../../pv/entities/pv.entity';
import { MoreThanOrEqual } from 'typeorm';
import { parse } from 'user-agent'; // 引入user-agent解析器

@Injectable()
export class PvInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Pv)
    private PvRepository: Repository<Pv>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const getRealIp = (req: Request): string => {
      const result =
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress ||
        req.ip;
      return Array.isArray(result) ? result[0] : result;
    };
    const request: Request = context.switchToHttp().getRequest();
    const path = request.path;
    const ipAddress = getRealIp(request);
    const userAgent = request.headers['user-agent'] as string;
    // 如果path是/就不记录
    if (path === '/') {
      return next.handle();
    }
    // 获取今日的开始时间（0点）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 检查今日是否已经记录过该IP
    const existingLog = await this.PvRepository.findOne({
      where: {
        ipAddress,
        timestamp: MoreThanOrEqual(todayStart), // 仅检查今日的记录
      },
    });

    // 解析用户代理信息
    const userAgentInfo = parse(userAgent);
    const deviceType = userAgentInfo.full || 'unknown';
    const browserName = userAgentInfo.name || 'unknown';
    const browserVersion = userAgentInfo.version || 'unknown';

    // 如果今日未记录过该IP，则保存PV日志
    if (!existingLog) {
      await this.PvRepository.save({
        path,
        ipAddress,
        timestamp: new Date(),
        deviceType, // 添加设备类型
        browserName, // 添加浏览器名称
        browserVersion, // 添加浏览器版本
      });
    }
    if (existingLog) {
      // 如果今日已记录过该IP，则更新时间戳
      existingLog.timestamp = new Date();
      await this.PvRepository.save(existingLog);
    }
    return next.handle();
  }
}
