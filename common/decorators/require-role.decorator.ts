import { SetMetadata, applyDecorators, UseGuards, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { Role } from 'src/user/entities/user.entity';

// 设置角色元数据的key
export const ROLES_KEY = 'roles';

// 角色装饰器
export const RequireRole = (...roles: Role[]) => {
    return applyDecorators(
        SetMetadata(ROLES_KEY, roles),
        UseGuards(AuthGuard, RoleGuard)
    );
};

// 角色守卫
import { Injectable, CanActivate, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.userId) {
            return false;
        }

        // 查询用户角色
        const userEntity = await this.userRepository.findOne({
            where: { id: user.userId },
            select: ['role']
        });

        if (!userEntity) {
            return false;
        }

        const hasRole = requiredRoles.some(role => userEntity.role === role);

        if (!hasRole) {
            throw new ForbiddenException('权限不足，需要超级管理员权限');
        }

        return true;
    }
}

// 获取当前用户ID的装饰器
export const CurrentUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): number => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.userId;
    },
); 