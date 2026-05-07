export interface JwtPayload {
    userId: number;
    openId?: string;
    email?: string;
}