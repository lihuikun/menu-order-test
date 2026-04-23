import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config(); // 加载 .env 文件

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql', // 数据库类型，可更改为 'postgres', 'sqlite' 等
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + '/../**/*.entity.{js,ts}'], // 实体文件路径
  synchronize: true, // 是否自动同步数据库，
  // logging: true, // 开启日志输出
  // 设置为utf8mb4字符集
  charset: 'utf8mb4',
  extra: {
    charset: 'utf8mb4', // 这里也指定字符集
  },
};
