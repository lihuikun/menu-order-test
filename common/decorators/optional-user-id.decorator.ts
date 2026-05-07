import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * 可选的用户ID装饰器
 * 从请求头中解析token获取用户ID，解析失败时返回undefined
 * 不会抛出异常，适用于不需要强制认证的接口
 */
export const OptionalUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      return undefined;
    }

    try {
      const token = authorization.split(' ')[1];
      if (!token) {
        return undefined;
      }

      // 获取JwtService实例
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET,
      });

      const decoded = jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });

      return decoded.userId;
    } catch (error) {
      // 解析失败时返回undefined，不抛出异常
      return undefined;
    }
  },
);
