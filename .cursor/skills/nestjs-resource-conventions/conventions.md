# 代码规范详解（conventions.md）

本文件是 `SKILL.md` 的扩展，提供更细颗粒度的规范、动机与反例。当 `SKILL.md` 中提到“详见 conventions.md”时阅读本文件。

## 1. TypeScript 类型策略

### 1.1 严格模式

`tsconfig.json` 的关键开关：

- `"strictNullChecks": true`：所有可能为 `null/undefined` 的值必须显式处理。
- `"emitDecoratorMetadata": true` + `"experimentalDecorators": true`：装饰器元数据已开启，可放心使用 NestJS / TypeORM / class-validator 装饰器。
- `"noImplicitAny": false`：允许隐式 any，但**不要主动滥用**——能写出类型就写出来。
- `"forceConsistentCasingInFileNames": true`：导入路径大小写必须一致（Windows 也强制）。

### 1.2 推荐写法

- 函数返回值显式声明类型，特别是 Service 方法：

  ```ts
  async findOne(id: number): Promise<User> { ... }
  ```

- 不要用 `Object` / `Function` 作为类型；用具体接口或 `Record<string, unknown>`。
- 调用第三方库返回 `any` 时，能 `as` 收窄就收窄；无法收窄时使用 `unknown` 并配合类型守卫。

### 1.3 反例

```ts
// ❌ 禁止：参数和返回值都是 any
async create(dto: any): any { ... }

// ✅ 推荐
async create(dto: CreateUserDto): Promise<User> { ... }
```

## 2. 模块组织规范

### 2.1 模块拆分原则

- 一个业务资源 = 一个模块目录；
- 公共能力（拦截器、过滤器、装饰器、工具函数）放 `src/common/`，按子目录拆分，例如：
  ```
  src/common/
  ├── decorators/
  ├── filters/
  ├── interceptors/
  ├── pipes/
  └── utils/
  ```
- 配置类放 `src/config/`，每个配置一个文件，命名 `*.config.ts`。

### 2.2 模块依赖方向

- 业务模块**可以**依赖 `common/`、`config/`；
- 业务模块**不应**互相直接 import 内部 service；如需跨模块调用，被依赖模块必须 `exports` 该 service，并在依赖方 `imports` 中引入对方模块。
- 禁止出现循环依赖；如果出现，优先考虑抽出公共模块解决。

## 3. 控制器规范

### 3.1 路由

- 路径使用复数 + kebab-case：`@Controller('order-items')`；
- 嵌套资源使用复合路径：`@Controller('users/:userId/orders')`；
- 特殊操作放在动词路径下：`@Post(':id/publish')`。

### 3.2 HTTP 方法语义

| 操作 | 方法 | 路径示例 |
|------|------|----------|
| 列表 | `@Get()` | `/users` |
| 详情 | `@Get(':id')` | `/users/1` |
| 创建 | `@Post()` | `/users` |
| 部分更新 | `@Patch(':id')` | `/users/1` |
| 整体替换 | `@Put(':id')` | `/users/1`（不常用） |
| 删除 | `@Delete(':id')` | `/users/1` |

### 3.3 参数提取

- `@Body() dto: CreateXxxDto`：必须使用 DTO；不要直接 `@Body() body: any`；
- `@Param('id') id: string`：路径参数始终是字符串，业务里转换为 number 用 `+id` 或 `ParseIntPipe`；
- `@Query() query: ListXxxDto`：查询参数也建议用 DTO 接收并校验；
- 业务字段不要从 header / cookie 直接读取；走自定义装饰器或守卫。

### 3.4 响应

- 直接 `return` 业务数据；
- 状态码默认正确（`POST` 默认 201，其他 200）；如需变更使用 `@HttpCode(204)`；
- 全局响应包装拦截器若已存在，**不要在控制器里手动包装**为 `{ code, data, message }`。

## 4. 服务层规范

### 4.1 依赖注入

```ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

- 字段统一加 `private readonly`；
- 同模块多个 Repository 依次注入；跨模块的 Service 通过模块 `exports` 暴露。

### 4.2 业务异常

- 资源不存在：`throw new NotFoundException('用户不存在')`；
- 参数非法（DTO 校验已通过但业务规则不符）：`throw new BadRequestException('xxx 已存在')`；
- 鉴权失败：`UnauthorizedException` / `ForbiddenException`；
- **禁止 `throw new Error(...)`**，会被全局过滤器（如有）当成 500。

### 4.3 事务

- 简单 CRUD 直接用 Repository；
- 跨实体的写操作使用 `DataSource.transaction(...)` 或 `QueryRunner`，确保原子性。

## 5. DTO 规范

### 5.1 创建 DTO 模板

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'jane' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  userName: string;

  @ApiProperty({ description: '邮箱', example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;
}
```

### 5.2 更新 DTO 模板

**必须**使用 `@nestjs/swagger` 的 `PartialType`，与现有 `update-user.dto.ts` 保持一致：

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

> 不要从 `@nestjs/mapped-types` 导入 `PartialType`，否则 Swagger 文档里字段会丢失 `@ApiProperty` 元数据。

### 5.3 启用全局校验

如果新增模块时发现 `main.ts` 没有 `app.useGlobalPipes(new ValidationPipe(...))`，**应同步补上**：

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // 自动剔除 DTO 未声明字段
    forbidNonWhitelisted: true, // 出现未声明字段时直接报错
    transform: true,            // 自动按 DTO 类型转换（如 string → number）
  }),
);
```

## 6. 实体规范

### 6.1 标准模板

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users') // 表名复数 + snake_case
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_name', length: 64 })
  userName: string;

  @Column({ length: 128, unique: true })
  email: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 6.2 关系

- 多对一 / 一对多：始终在两端都声明，便于 TypeORM 自动关联；
- 关联字段命名：`<feature>Id`（属性）+ `<feature>_id`（数据库列）。

```ts
@ManyToOne(() => User, (user) => user.articles)
@JoinColumn({ name: 'user_id' })
author: User;

@Column({ name: 'user_id' })
userId: number;
```

### 6.3 软删除

如果业务需要软删除，加 `@DeleteDateColumn({ name: 'deleted_at' })`，并在 Service 调用 `softRemove` / `softDelete`。

## 7. 异常与错误处理

### 7.1 优先使用内置异常

| 场景 | 异常 | 状态码 |
|------|------|--------|
| 参数错误 | `BadRequestException` | 400 |
| 未鉴权 | `UnauthorizedException` | 401 |
| 鉴权但无权限 | `ForbiddenException` | 403 |
| 资源不存在 | `NotFoundException` | 404 |
| 资源冲突（重复） | `ConflictException` | 409 |
| 不支持的方法 | `MethodNotAllowedException` | 405 |
| 服务端兜底 | `InternalServerErrorException` | 500 |

### 7.2 全局过滤器

如果未来在 `src/common/filters/` 中新增 `HttpExceptionFilter`，应在 `main.ts` 注册：

```ts
app.useGlobalFilters(new HttpExceptionFilter());
```

并保证响应结构统一，例如：

```jsonc
{
  "code": 400,
  "message": "用户不存在",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/users/999"
}
```

## 8. 日志

- 业务日志统一使用 `Logger`：

  ```ts
  private readonly logger = new Logger(UsersService.name);
  this.logger.log('创建用户成功', { id });
  ```

- 不允许在新代码里使用 `console.log` / `console.error`；
- 错误日志使用 `this.logger.error(message, stack)`。

## 9. 配置与环境变量

- 所有配置通过 `process.env.X` 读取；
- 推荐通过 `@nestjs/config` 的 `ConfigService` 读取（已在依赖中），避免散落的 `process.env`；
- `.env`、`.env.local` 等文件**禁止**提交（确保 `.gitignore` 生效）；维护一份 `.env.example` 列出所有 KEY；
- 添加新变量时同步更新：`.env.example` + README 的环境变量说明（若无则新增章节）。

## 10. 测试规范

- 单测文件命名 `*.spec.ts`，与被测文件同目录；
- e2e 测试放 `test/`，命名 `*.e2e-spec.ts`，配置走 `test/jest-e2e.json`；
- 新增 Service 时**至少**编写 happy path + 一个异常分支测试；
- Mock Repository 推荐写法：

  ```ts
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const module = await Test.createTestingModule({
    providers: [
      UsersService,
      { provide: getRepositoryToken(User), useValue: mockRepo },
    ],
  }).compile();
  ```

## 11. 常用片段速查

### 11.1 列表查询带分页

```ts
async findAll(query: ListUserDto) {
  const { page = 1, pageSize = 10 } = query;
  const [items, total] = await this.usersRepository.findAndCount({
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { createdAt: 'DESC' },
  });
  return { items, total, page, pageSize };
}
```

### 11.2 唯一性校验

```ts
const exists = await this.usersRepository.findOne({ where: { email: dto.email } });
if (exists) {
  throw new ConflictException('邮箱已被注册');
}
```

### 11.3 路径参数转 number

```ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

## 12. 在生成代码时的自检清单

完成代码后，**严格按以下清单自检**，任意一项不通过都需要修复：

- [ ] 文件名 / 目录名 / 类名是否符合命名规范？
- [ ] 是否使用了单引号 + 尾随逗号？
- [ ] 所有 Promise 调用是否都 `await` 或 `void`？
- [ ] DTO 是否同时配齐 `class-validator` + `@ApiProperty`？
- [ ] `UpdateXxxDto` 是否从 `@nestjs/swagger` 导入 `PartialType`？
- [ ] Entity 文件名是否以 `.entity.ts` 结尾？
- [ ] Controller 是否加了 `@ApiTags` 与每个方法的 `@ApiOperation`？
- [ ] 业务异常是否使用 NestJS 内置异常类？
- [ ] 新模块是否在 `AppModule.imports` 中注册？
- [ ] 没有遗留 `console.log` / `debugger` / `any`（除必要场景并加注释）？
