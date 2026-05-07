---
name: nestjs-resource-conventions
description: 在本 NestJS 脚手架项目中按既定的目录结构、命名规范、代码风格、Swagger 注解与 TypeORM 约定生成或维护业务模块（Module/Controller/Service/DTO/Entity）。当用户要求“新增模块/资源”、“新增接口”、“按项目规范写一个 xxx”、“生成 CRUD”、或在 src/ 下编写控制器、服务、实体、DTO、配置时使用本 skill。
---

# NestJS 资源模块规范（本项目专用）

本 skill 描述了本仓库（基于 NestJS 10 + TypeORM + Swagger + class-validator 的脚手架）必须遵守的目录结构、命名规范、代码风格与新增业务模块的标准工作流。生成或修改代码时，**严格按照本文件所述规范执行**。

> 本 skill 中的“资源/模块/Resource”均指一组同名的 `Module + Controller + Service + DTO + Entity` 文件，等价于 `nest g resource <name>` 的产物。

## 一、项目技术栈与基线信息

- 运行时：Node.js + TypeScript（target ES2023，模块 nodenext）
- 框架：`@nestjs/common`、`@nestjs/core` ^10
- 数据库：MySQL（`mysql2` 驱动）+ `@nestjs/typeorm` + `typeorm`
- 文档：`@nestjs/swagger`，挂载在 `/api-docs`
- 校验：`class-validator` + `class-transformer`
- 配置：`@nestjs/config` + `dotenv`
- 鉴权（已装备但未默认启用）：`@nestjs/jwt`、`@nestjs/passport`、`passport-github2`
- 包管理：**pnpm**（禁止使用 npm/yarn 安装依赖；命令统一用 `pnpm xxx`）
- 提交规范：`@commitlint/config-conventional` + `husky` + `lint-staged`
- 代码风格：ESLint（typescript-eslint，type-checked 严格集）+ Prettier

## 二、目录结构（必须遵守）

```
src/
├── main.ts                 # 入口：创建 app、配置 Swagger、启动监听
├── app.module.ts           # 根模块：聚合 TypeOrmModule.forRoot 与各业务模块
├── app.controller.ts       # 根控制器示例（@ApiTags 必填）
├── app.service.ts
├── config/
│   └── database.config.ts  # TypeOrmModuleOptions（读 .env）
└── <feature>/              # 业务模块（kebab-case，复数名）
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.service.ts
    ├── <feature>.controller.spec.ts
    ├── <feature>.service.spec.ts
    ├── dto/
    │   ├── create-<singular>.dto.ts
    │   └── update-<singular>.dto.ts
    └── entities/
        └── <singular>.entity.ts

test/
├── app.e2e-spec.ts
└── jest-e2e.json
```

关键约定：
- 业务模块目录名使用**复数 + kebab-case**（例：`users/`、`order-items/`）。
- DTO 与 Entity 的文件名使用**单数 + kebab-case**（例：`create-user.dto.ts`、`user.entity.ts`）。
- 所有数据库实体文件**必须以 `.entity.ts` 结尾**，TypeORM 通过 `entities: [__dirname + '/../**/*.entity.{js,ts}']` 自动扫描。
- 跨模块共享的配置统一放 `src/config/`，跨模块共享的工具/装饰器/拦截器后续放在 `src/common/`（无则按需新建）。

## 三、命名规范

| 对象 | 规则 | 示例 |
|------|------|------|
| 文件名 | kebab-case，按 `<name>.<role>.ts` | `order-items.controller.ts` |
| 模块目录 | 复数 + kebab-case | `order-items/` |
| 类名 | PascalCase，与角色后缀对应 | `OrderItemsController` |
| Entity 类 | 单数 PascalCase | `OrderItem` |
| DTO 类 | `Create<Name>Dto` / `Update<Name>Dto` | `CreateOrderItemDto` |
| 路由路径 | 复数 + kebab-case | `@Controller('order-items')` |
| 接口字段（DTO/Entity 属性） | camelCase | `userName`、`createdAt` |
| 数据库列 | 通过 `@Column({ name: 'snake_case' })` 显式映射（推荐） | `name: 'user_name'` |
| 环境变量 | UPPER_SNAKE_CASE | `DATABASE_HOST` |

## 四、代码风格（Prettier + ESLint 强制）

`.prettierrc`：

- `singleQuote: true`：字符串统一使用单引号。
- `trailingComma: 'all'`：多行结构尾随逗号。
- `endOfLine: 'auto'`：跟随系统换行。

ESLint 关键规则（来自 `eslint.config.mjs`）：

- 启用 `tseslint.configs.recommendedTypeChecked`：**必须通过类型检查**，不要写出会触发 `no-unsafe-*` 的代码（如把 `any` 直接传入需要具体类型的参数）。
- `@typescript-eslint/no-explicit-any: 'off'`：允许使用 `any`，但**应尽量避免**；优先使用具体类型或 `unknown`。
- `@typescript-eslint/no-floating-promises: 'warn'`：所有返回 Promise 的调用必须 `await` 或显式 `void`，参考 `main.ts` 中的 `void bootstrap();`。
- `prettier/prettier: error`：违反 Prettier 规则会直接报错。

代码书写硬性要求：

1. **使用单引号**，多行尾随逗号。
2. **使用 ES Module 语法**（`import` / `export`），禁止 `require`。
3. **导入顺序**：先第三方包（`@nestjs/*` 等），空一行后是本项目相对导入。
4. **构造函数注入依赖**使用 `private readonly`，例如：
   ```ts
   constructor(private readonly usersService: UsersService) {}
   ```
5. **业务注释使用中文**（项目其余注释均为中文，保持风格一致）。
6. **不要在生产代码里写 `console.log`**（`users.controller.ts` 当前的 `console.log` 是历史遗留，新增代码不要照抄）。
7. **接口/控制器方法返回值**直接 `return` 数据；全局拦截器（如后续新增）会统一包装。

## 五、模块结构规范

### 5.1 根模块 `app.module.ts`

- 通过 `TypeOrmModule.forRoot(databaseConfig)` 加载数据库；
- 新增业务模块要在 `imports` 数组中**追加**，**禁止移动或删除已有项**；
- 业务模块自身需要的 Repository 在**业务模块内部**通过 `TypeOrmModule.forFeature([Entity])` 注入，**不要**写在 `AppModule` 里。

### 5.2 业务模块 `<feature>.module.ts`

标准模板：

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { <Name>Controller } from './<feature>.controller';
import { <Name>Service } from './<feature>.service';
import { <Singular> } from './entities/<singular>.entity';

@Module({
  imports: [TypeOrmModule.forFeature([<Singular>])],
  controllers: [<Name>Controller],
  providers: [<Name>Service],
  exports: [<Name>Service],
})
export class <Name>Module {}
```

要点：
- 当前仓库 `users.module.ts` 还未接入 TypeORM，新模块**应直接接入** `TypeOrmModule.forFeature`；
- 仅当 Service 需要被其他模块使用时才 `exports`，否则可省略。

### 5.3 控制器 `<feature>.controller.ts`

- 类必须有 `@ApiTags('中文模块名')` 用于 Swagger 分组；
- 每个路由方法必须有 `@ApiOperation({ summary: '中文摘要' })`；
- 路径参数仍写为 `:id`，方法签名中通过 `+id` 转换为 number；
- 严格按 REST 风格使用 `@Get / @Post / @Patch / @Delete`；
- 不要在 controller 中写业务逻辑，只做参数解析与 Service 调用。

参考 `app.controller.ts` 的注解风格：

```startLine:endLine:src/app.controller.ts
@ApiTags('菜单模块')
@Controller('menu')
export class AppController {
  @Get('random')
  @ApiOperation({ summary: '随机推荐一个吃的' })
  getRandomMenu() {
    return '麻辣烫';
  }
}
```

### 5.4 服务 `<feature>.service.ts`

- 用 `@Injectable()` 标注；
- 通过 `@InjectRepository(<Singular>)` 注入 Repository；
- 方法语义对齐 RESTful：`create / findAll / findOne / update / remove`；
- 抛业务错误使用 NestJS 自带异常类（`NotFoundException`、`BadRequestException` 等），不要 `throw new Error`。

### 5.5 DTO `dto/`

- `create-<singular>.dto.ts`：定义所有创建字段，配合 `class-validator` 装饰器；
- `update-<singular>.dto.ts`：使用 **`@nestjs/swagger` 的 `PartialType`**（与现有 `update-user.dto.ts` 保持一致），**不要**误用 `@nestjs/mapped-types`：

  ```ts
  import { PartialType } from '@nestjs/swagger';
  import { CreateUserDto } from './create-user.dto';

  export class UpdateUserDto extends PartialType(CreateUserDto) {}
  ```

- DTO 字段建议同时加 `@ApiProperty(...)` 与 `class-validator` 校验装饰器，便于 Swagger 与运行时校验。

### 5.6 实体 `entities/<singular>.entity.ts`

- 类使用单数 PascalCase；
- 文件**必须**以 `.entity.ts` 结尾，否则不会被 `database.config.ts` 的 glob 扫描到；
- 主键统一用 `@PrimaryGeneratedColumn()`（如非有特别业务需求）；
- 时间戳使用 `@CreateDateColumn()` / `@UpdateDateColumn()`；
- 字符集已在数据库层面统一为 `utf8mb4`，无需在每个字段上重复声明。

## 六、数据库与配置

`src/config/database.config.ts` 已固定如下行为，**新增模块时不要重复定义这些**：

- 类型 MySQL，连接信息全部走 `process.env.DATABASE_*`；
- `entities` 已使用 glob 扫描，不需要在 `AppModule` 中再手动注册实体；
- `synchronize: true` 当前为开启状态——**仅适合开发环境**；编写涉及数据结构变更的代码时要在 PR 描述中提醒，避免生产环境直接同步。

新增数据库相关环境变量时：
- 在 `.env`（本地）和 `.env.example`（如不存在则**新建**）里同时声明；
- 命名遵守 `UPPER_SNAKE_CASE`，前缀 `DATABASE_` 用于数据库连接。

## 七、Swagger 规范

- `main.ts` 中文档已经命名为「情侣菜单 API」，挂载路径 `/api-docs`，**不要随意改动**；
- 控制器：`@ApiTags('xxx 模块')`（中文，模块语义）；
- 方法：`@ApiOperation({ summary: '中文动词短语' })`；
- DTO：每个字段加 `@ApiProperty({ description: '中文描述', example: ... })`；
- 受保护的接口（后续接入 JWT）：加 `@ApiBearerAuth()`。

## 八、新增业务模块工作流（核心流程）

每次需要新增一个业务资源（例如 `articles`）时，按此清单逐步执行：

```
任务进度：
- [ ] 1. 与用户确认资源名（单数 + 复数）和必要字段
- [ ] 2. 在 src/ 下创建模块目录与子目录（dto/ entities/）
- [ ] 3. 写 entity（含字段、主键、时间戳）
- [ ] 4. 写 create dto（class-validator + ApiProperty）
- [ ] 5. 写 update dto（继承 PartialType(CreateXxxDto)，from @nestjs/swagger）
- [ ] 6. 写 service（注入 Repository，实现 CRUD）
- [ ] 7. 写 controller（@ApiTags + @ApiOperation，调用 service）
- [ ] 8. 写 module（TypeOrmModule.forFeature + controllers + providers）
- [ ] 9. 在 app.module.ts 的 imports 末尾追加新模块
- [ ] 10. 运行 pnpm lint 修复风格 / 运行 pnpm build 校验类型
- [ ] 11. 必要时补 .env 变量与 README 说明
```

详细的文件级模板见 [templates.md](templates.md)；更系统的命名 / 风格 / 校验 / 异常细则见 [conventions.md](conventions.md)。

## 九、命令清单（pnpm）

| 场景 | 命令 |
|------|------|
| 安装依赖 | `pnpm install` |
| 启动开发（watch） | `pnpm dev` |
| 启动开发（普通） | `pnpm start` |
| 生产构建 | `pnpm build` |
| 启动生产 | `pnpm start:prod` |
| 调试 | `pnpm start:debug` |
| 修复 lint | `pnpm lint` |
| 格式化 | `pnpm format` |
| 单元测试 | `pnpm test` |
| 测试覆盖率 | `pnpm test:cov` |
| e2e 测试 | `pnpm test:e2e` |

> 不要替换为 npm/yarn；本仓库已存在 `pnpm-lock.yaml`。

## 十、提交与分支约定

- 提交信息遵守 `@commitlint/config-conventional`：`type(scope): subject`，type 取自 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert` 等；scope 推荐用模块名（例如 `feat(users): 新增创建用户接口`）。
- 提交时 husky 会触发 commitlint，**不要使用 `--no-verify`**。
- 一次 PR 仅完成一个相对独立的功能；新增模块的 PR 标题示例：`feat(articles): 新增文章资源 CRUD`。

## 十一、常见反模式（务必避免）

1. ❌ 在 `AppModule` 中通过 `TypeOrmModule.forFeature` 注册某模块自己的实体——应该写在该模块自己的 `*.module.ts` 内。
2. ❌ DTO 文件中混入业务逻辑或副作用代码。
3. ❌ Controller 中直接操作 Repository——必须经过 Service。
4. ❌ 使用 `any` 隐藏类型问题（除非确实无法避免，并加中文注释说明原因）。
5. ❌ 在新代码中保留 `console.log`、`debugger`、`TODO` 但无日期/责任人。
6. ❌ Entity 文件名不带 `.entity` 后缀——会导致 TypeORM 扫描不到。
7. ❌ Update DTO 错误地从 `@nestjs/mapped-types` 导入 `PartialType`——本项目统一使用 `@nestjs/swagger` 的 `PartialType`，否则 Swagger 字段元信息会丢失。
8. ❌ 新增模块后忘记在 `app.module.ts` 的 `imports` 中注册。

## 十二、补充资料

- 详细规范与示例代码：[conventions.md](conventions.md)
- 文件模板（可直接套用并替换占位符）：[templates.md](templates.md)
