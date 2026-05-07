import { Injectable, ConflictException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, LoginType, Role } from '../user/entities/user.entity';
import { Repository, In } from 'typeorm';
import { CreateEmailUserDto } from './dto/create-email-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { CreateGithubLoginDto } from './dto/github-login.dto';
import { VerificationService } from '../verification/verification.service';
import { VerificationType } from '../verification/entities/verification.entity';
import { TeamService } from '../team/team.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly verificationService: VerificationService,
    private readonly teamService: TeamService,
  ) { }
  private readonly githubAppConfigs = {
    default: {
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
    },
    'js-daily': {
      redirect_uri: process.env.GITHUB_JS_DAILY_CALLBACK_URL,
      client_id: process.env.GITHUB_JS_DAILY_CLIENT_ID,
      client_secret: process.env.GITHUB_JS_DAILY_CLIENT_SECRET,
    },
  }

  /**
   * 确保用户有默认 teamId。
   */
  private async ensureTeamMembership(userId: number): Promise<void> {
    await this.teamService.ensureUserTeam(userId);
  }

  /**
   * 登录/注册成功后，如果带了邀请码则自动加入目标团队。
   */
  private async autoJoinTeamByInviteCode(userId: number, inviteCode?: string): Promise<void> {
    if (!inviteCode) return;
    await this.teamService.joinTeamByInviteCode(userId, inviteCode);
  }
  // 统一生成JWT的方法
  private generateToken(payload: any): string {
    try {
      const token = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '30d' // 30天，约一个月
      });
      this.logger.log(`生成token成功: ${JSON.stringify(payload)}`);
      return token;
    } catch (error) {
      this.logger.error(`生成token失败: ${error.message}`);
      throw error;
    }
  }

  async emailRegister(createEmailUserDto: CreateEmailUserDto): Promise<User> {
    const { email, password, code, nickname, avatarUrl, inviteCode } = createEmailUserDto;
    
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }
    
    // 添加正则表达式
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegex.test(email)) {
      throw new ConflictException('邮箱格式不正确');
    }
    
    // 验证码可选：仅在传入验证码时校验
    if (code) {
      try {
        const isVerified = await this.verificationService.verifyCode({
          email,
          code,
          type: VerificationType.EMAIL_REGISTRATION,
        });
        
        if (!isVerified) {
          throw new BadRequestException('验证码无效');
        }
      } catch (error) {
        throw new BadRequestException(error.message || '验证码验证失败');
      }
    }
    
    // 创建新用户
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = this.hashPassword(password, salt);
    const user = this.userRepository.create({
      email,
      password: `${salt}:${hashedPassword}`,
      nickname,
      avatarUrl,
      loginType: LoginType.EMAIL,
    });

    await this.userRepository.save(user);

    // 生成 JWT 令牌，仅使用userId和email
    const payload = { userId: user.id, email: user.email };
    user.token = this.generateToken(payload);
    await this.ensureTeamMembership(user.id);
    await this.autoJoinTeamByInviteCode(user.id, inviteCode);

    return user;
  }

  async emailLogin(email: string, password: string, inviteCode?: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, loginType: LoginType.EMAIL },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isPasswordValid = this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 生成 JWT 令牌，仅使用userId和email
    const payload = { userId: user.id, email: user.email };
    user.token = this.generateToken(payload);
    await this.ensureTeamMembership(user.id);
    await this.autoJoinTeamByInviteCode(user.id, inviteCode);

    return user;
  }

  // 使用 crypto 哈希密码
  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  // 验证密码
  private verifyPassword(password: string, storedPassword: string): boolean {
    const [salt, hashedPassword] = storedPassword.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashedPassword;
  }

  async githubLogin(createGithubLoginDto: CreateGithubLoginDto): Promise<User> {
    const { code,type='default', inviteCode } = createGithubLoginDto;
    console.log('type', type)
    const config = this.githubAppConfigs[type];

    const response = await axios.post('https://github.com/login/oauth/access_token', {
      redirect_uri: config.redirect_uri,
      client_id: config.client_id,
      client_secret: config.client_secret,
      code,
    }, {
      headers: { 'accept': 'application/json' },
    });
    const { access_token } = response.data;
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const { login, avatar_url, email, id } = userResponse.data;
    this.logger.log(`GitHub登录响应: ${JSON.stringify(userResponse.data)}`);

    const user = await this.userRepository.findOne({ where: { openId: id.toString() } });
    if (!user) {
      const newUser = this.userRepository.create({
        openId: id.toString(),
        email,
        loginType: LoginType.GITHUB,
        nickname: login,
        avatarUrl: avatar_url,
      });
      await this.userRepository.save(newUser);

      // 生成 JWT 令牌
      const payload = { userId: newUser.id, openId: newUser.openId };
      newUser.token = this.generateToken(payload);

      // 保存token到用户记录
      await this.userRepository.save(newUser);
      await this.ensureTeamMembership(newUser.id);
      await this.autoJoinTeamByInviteCode(newUser.id, inviteCode);

      return newUser;
    }

    // 生成 JWT 令牌
    const payload = { userId: user.id, openId: user.openId };
    user.token = this.generateToken(payload);
    user.nickname = login;
    user.avatarUrl = avatar_url;
    // 保存token到用户记录
    await this.userRepository.save(user);
    await this.ensureTeamMembership(user.id);
    await this.autoJoinTeamByInviteCode(user.id, inviteCode);

    return user;
  }

  async updateUser(id: number, userDto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户信息
    user.nickname = userDto.nickname || user.nickname;
    user.avatarUrl = userDto.avatarUrl || user.avatarUrl;

    await this.userRepository.save(user);
    return user;
  }

  // 分页获取用户列表
  async getUserList(page: number = 1, pageSize: number = 10, keyword?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // 如果有关键词，添加模糊搜索条件
    if (keyword) {
      queryBuilder.where('user.nickname LIKE :keyword', { keyword: `%${keyword}%` })
        .orWhere('user.email LIKE :keyword', { keyword: `%${keyword}%` });
    }
    
    // 分页和排序
    queryBuilder.skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('user.id', 'DESC');
    
    const [list, total] = await queryBuilder.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // 删除用户
  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    await this.userRepository.remove(user);
    return { success: true };
  }

  // 部分字段更新用户
  async updateUserPartial(id: number, dto: Partial<CreateUserDto>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    Object.assign(user, dto);
    await this.userRepository.save(user);
    return user;
  }

  // 获取用户角色 - 公共方法
  async getUserRole(userId: number): Promise<Role> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['role']
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user.role;
  }

  // 获取用户完整信息 - 公共方法
  async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }

  // 批量获取用户基础信息 - 公共方法
  async getUsersBasicInfo(userIds: number[]): Promise<{ [key: number]: { id: number; nickname?: string; avatarUrl?: string } }> {
    if (!userIds.length) return {};

    const users = await this.userRepository.find({
      where: { id: In(userIds.filter(id => id)) }, // 使用In操作符进行批量查询
      select: ['id', 'nickname', 'avatarUrl']
    });

    // 转换为键值对格式便于查找
    return users.reduce((acc, user) => {
      acc[user.id] = {
        id: user.id,
        nickname: user.nickname || '未设置昵称',
        avatarUrl: user.avatarUrl || ''
      };
      return acc;
    }, {});
  }

  // 根据单个用户ID获取基础信息
  async getUserBasicInfo(userId: number): Promise<{ id: number; nickname?: string; avatarUrl?: string } | null> {
    if (!userId) return null;

    const usersInfo = await this.getUsersBasicInfo([userId]);
    return usersInfo[userId] || null;
  }
}
