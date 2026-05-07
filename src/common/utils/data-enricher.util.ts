import { UserService } from 'src/user/user.service';

export class DataEnricher {
    constructor(private readonly userService: UserService) { }

    /**
     * 为数据添加用户信息
     * @param items 数据数组
     * @param userIdField 用户ID字段名
     * @param userInfoField 用户信息字段名（默认为'user'）
     */
    async enrichWithUserInfo<T extends Record<string, any>>(
        items: T[],
        userIdField: keyof T,
        userInfoField: string = 'user'
    ): Promise<any[]> {
        if (!items.length) return [];

        // 提取所有用户ID
        const userIds = [...new Set(items.map(item => item[userIdField]).filter(id => id))];

        // 批量获取用户信息
        const usersInfo = await this.userService.getUsersBasicInfo(userIds);

        // 为每个数据项添加用户信息
        return items.map(item => ({
            ...item,
            [userInfoField]: usersInfo[item[userIdField]] || {
                id: item[userIdField],
                nickname: '未知用户',
                avatarUrl: ''
            }
        }));
    }

    /**
     * 为文章添加作者信息
     */
    async enrichWithAuthorInfo(items: any[]): Promise<any[]> {
        return this.enrichWithUserInfo(items, 'authorId', 'author');
    }

    /**
     * 为评论添加用户信息
     */
    async enrichWithCommenterInfo(items: any[]): Promise<any[]> {
        return this.enrichWithUserInfo(items, 'userId', 'user');
    }

    /**
     * 为消息添加发送者信息
     */
    async enrichWithSenderInfo(items: any[]): Promise<any[]> {
        return this.enrichWithUserInfo(items, 'senderId', 'sender');
    }
} 