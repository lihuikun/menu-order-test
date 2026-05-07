import { SetMetadata, applyDecorators, UseGuards, createParamDecorator, ExecutionContext, Injectable, CanActivate, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

// 设置会员元数据的key
export const PREMIUM_KEY = 'premium';

// 会员装饰器
export const RequirePremium = () => {
    return applyDecorators(
        SetMetadata(PREMIUM_KEY, true),
        UseGuards(AuthGuard, PremiumGuard)
    );
};

// 会员守卫
@Injectable()
export class PremiumGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requirePremium = this.reflector.getAllAndOverride<boolean>(PREMIUM_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requirePremium) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user?.userId) {
            return false;
        }

        // 查询用户会员状态
        const userEntity = await this.userRepository.findOne({
            where: { id: user.userId },
            select: ['isPremium']
        });

        if (!userEntity) {
            return false;
        }

        if (!userEntity.isPremium) {
            throw new ForbiddenException('权限不足，需要会员权限');
        }

        return userEntity.isPremium;
    }
}

// 检查用户是否是会员的工具方法
export const checkIsPremium = async (userId: number, userRepository: Repository<User>): Promise<boolean> => {
    if (!userId) return false;

    const user = await userRepository.findOne({
        where: { id: userId },
        select: ['isPremium']
    });

    return user?.isPremium || false;
}; 