// 违规检测管道
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { findSensitiveWords } from '../utils/sensitive-word.util';

@Injectable()
export class SensitivePipe implements PipeTransform {
    transform(value: any): any {
        const hits = this.scanObject(value);
        if (hits.length > 0) {
            console.log("🚀 ~ SensitivePipe ~ transform ~ `内容包含违规词：${[...new Set(hits)].join(', ')}`:", `内容包含违规词：${[...new Set(hits)].join(', ')}`)
            throw new BadRequestException(`内容包含违规词：${[...new Set(hits)].join(', ')}`);
        }
        return value;
    }

    private scanObject(obj: any): string[] {
        const hits: string[] = [];
        const queue = [obj];

        while (queue.length > 0) {
            const current = queue.pop();
            if (typeof current === 'string') {
                hits.push(...findSensitiveWords(current));
            } else if (typeof current === 'object' && current !== null) {
                Object.values(current).forEach(v => queue.push(v));
            }
        }

        return hits;
    }
}
