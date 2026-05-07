# 文件模板（templates.md）

本文件提供新增模块时可直接套用的代码模板。占位符约定：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `<feature>` | 模块目录名（复数 + kebab-case） | `articles` |
| `<singular>` | 文件层级单数名（kebab-case） | `article` |
| `<Name>` | 类名前缀（PascalCase 复数） | `Articles` |
| `<Singular>` | 实体类名（PascalCase 单数） | `Article` |

> 本文件中的全部代码片段均为**新代码模板**，使用 Markdown 代码块；不会引用项目现有行号。

---

## 一、完整示例：新增 `articles` 模块

下面以 `articles` 资源（包含 `id`、`title`、`content`、`authorId`、`createdAt`、`updatedAt`）为例，展示一整套文件应该如何写。

### 1. 目录结构

```
src/articles/
├── articles.module.ts
├── articles.controller.ts
├── articles.service.ts
├── articles.controller.spec.ts
├── articles.service.spec.ts
├── dto/
│   ├── create-article.dto.ts
│   ├── update-article.dto.ts
│   └── list-article.dto.ts
└── entities/
    └── article.entity.ts
```

### 2. `entities/article.entity.ts`

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'author_id' })
  authorId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 3. `dto/create-article.dto.ts`

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ description: '文章标题', example: 'NestJS 入门指南' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '文章正文（支持 Markdown）' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '作者用户 ID', example: 1 })
  @IsInt()
  @Min(1)
  authorId: number;
}
```

### 4. `dto/update-article.dto.ts`

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

### 5. `dto/list-article.dto.ts`（分页查询）

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListArticleDto {
  @ApiPropertyOptional({ description: '页码，从 1 开始', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '标题模糊搜索关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
```

### 6. `articles.service.ts`

```ts
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticleDto } from './dto/list-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article } from './entities/article.entity';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
  ) {}

  async create(dto: CreateArticleDto): Promise<Article> {
    const article = this.articlesRepository.create(dto);
    const saved = await this.articlesRepository.save(article);
    this.logger.log(`创建文章成功，id=${saved.id}`);
    return saved;
  }

  async findAll(query: ListArticleDto) {
    const { page = 1, pageSize = 10, keyword } = query;
    const [items, total] = await this.articlesRepository.findAndCount({
      where: keyword ? { title: Like(`%${keyword}%`) } : undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, pageSize };
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.articlesRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`文章不存在：${id}`);
    }
    return article;
  }

  async update(id: number, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);
    Object.assign(article, dto);
    return this.articlesRepository.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articlesRepository.remove(article);
  }
}
```

### 7. `articles.controller.ts`

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticleDto } from './dto/list-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('文章模块')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: '创建文章' })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '分页查询文章列表' })
  findAll(@Query() query: ListArticleDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文章详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新文章' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文章' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.remove(id);
  }
}
```

### 8. `articles.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
```

### 9. 在 `app.module.ts` 末尾注册

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    UsersModule,
    ArticlesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 二、单元测试模板

### `articles.service.spec.ts`

```ts
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repo: jest.Mocked<Repository<Article>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ArticlesService);
    repo = module.get(getRepositoryToken(Article));
  });

  it('创建文章应返回保存结果', async () => {
    const dto = { title: 't', content: 'c', authorId: 1 };
    const entity = { id: 1, ...dto } as Article;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toEqual(entity);
    expect(repo.create).toHaveBeenCalledWith(dto);
  });

  it('查询不存在的文章应抛 NotFoundException', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

### `articles.controller.spec.ts`

```ts
import { Test, TestingModule } from '@nestjs/testing';

import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

describe('ArticlesController', () => {
  let controller: ArticlesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: ArticlesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ArticlesController);
  });

  it('应当能成功实例化', () => {
    expect(controller).toBeDefined();
  });
});
```

---

## 三、`.env.example` 增量片段

新增数据库或第三方服务的环境变量时，按下面格式追加（保持中文注释一致）：

```dotenv
# 数据库配置
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=
DATABASE_NAME=nest_test

# JWT 鉴权
JWT_SECRET=please_change_me
JWT_EXPIRES_IN=7d
```

---

## 四、整体生成顺序（建议）

按下列顺序写代码，可以最大程度复用类型推断、减少返工：

1. `entities/<singular>.entity.ts`
2. `dto/create-<singular>.dto.ts`
3. `dto/update-<singular>.dto.ts`
4. `dto/list-<singular>.dto.ts`（如需分页）
5. `<feature>.service.ts`
6. `<feature>.service.spec.ts`
7. `<feature>.controller.ts`
8. `<feature>.controller.spec.ts`
9. `<feature>.module.ts`
10. 在 `app.module.ts` 注册新模块
11. 运行 `pnpm lint` + `pnpm build`，按报错修复
