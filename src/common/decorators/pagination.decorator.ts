// 分页装饰器
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export const Pagination = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): PaginationParams => {
        const request = ctx.switchToHttp().getRequest();
        const page = parseInt(request.query.page, 10) || 1;
        const pageSize = parseInt(request.query.pageSize, 10) || 10;

        return {
            page,
            pageSize,
        };
    },
);
