import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly secretKey;

  constructor() {
    this.secretKey = crypto
      .createHash('sha256')
      .update(process.env.CRYPTO_KEY)
      .digest();
  }
  encryptData(data: any): string {
    // 生成随机 IV
    const iv = crypto.randomBytes(16); // AES-256-CBC 的 IV 长度为 16 字节
    const cipher = crypto.createCipheriv('aes-256-cbc', this.secretKey, iv);

    // 加密数据
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 返回 IV 和加密数据的组合
    return iv.toString('base64') + ':' + encrypted;
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // sse不要加密，直接返回数据
        const isSSE = context?.switchToHttp()?.getRequest()?.headers?.accept?.includes('text/event-stream')||false;
        // 如果没有设置 CRYPTO_KEY，则直接返回数据
        const encryptedData = process.env.CRYPTO_KEY && !isSSE
          ? this.encryptData(data)
          : data;
        return { code: 200, msg: 'success', data: encryptedData };
      }),
    );
  }
}
