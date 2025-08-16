---
title: PostgreSQL上云：迁移至Neon平台
date: 2025-08-16 23:30:00 +0900
categories: [Study notes, Database]
tags: [postgresql, database, neon, cloud, tutorial]
image: /assets/img/2025-08-16-neon-migration/neon.png
---

## 迁移目的

在项目开发过程中，需要部署云上的自动化任务来处理数据，并将任务结果存储到数据库中。这就要求数据库也必须部署在云端，以便自动化任务能够直接访问和写入数据。虽然 AWS Aurora 或 RDS 是一个成熟的云数据库解决方案，但其成本对于开发和测试阶段来说过于昂贵。因此，我们需要寻找一个：
- **免费或低成本**的云数据库方案
- **支持 PostgreSQL** 以保持技术栈一致性

## 关于Neon

**[Neon](https://neon.com/)** 是一个基于云的 PostgreSQL 托管平台，主打无服务器 (Serverless)特性。它提供标准的 Postgres 接口，同时具备以下特点：

- **Serverless 架构**：按需启动和暂停数据库，避免持续运行的成本。
- **免费层友好**：0.5GB 存储、自动休眠/唤醒，适合开发和小规模项目。
- **pgvector 支持**：开箱即用，可直接存储和检索向量嵌入，适合 AI/ML 应用场景。
- **分支与克隆**：支持像 Git 一样对数据库做分支和即时克隆，方便测试与实验。
- **全球分布**：托管在 AWS 上，提供多个区域（如新加坡、悉尼、法兰克福等）。

## 本地环境

- PostgresSQL版本：16.8
- 数据库大小：111MB
- 数据格式：文本、向量

## 上云流程

### 1.基本设置

注册Neon账号，选择云服务类型（这里选的是AWS）以及服务区域，创建项目并设置数据库名称

### 2.创建数据库

- 点击界面左侧菜单中的`SQL Editor`
  {% include custom-image.html src="/assets/img/2025-08-16-neon-migration/create.png" %}
- （可选）创建pgvector扩展
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- 创建数据库表（以下为示例表结构）
  ```sql
  CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500),
    content TEXT,
    author VARCHAR(100),
    created_date DATE DEFAULT CURRENT_DATE,
    tags TEXT[],
    embedding vector(1536)
  );
  ```

### 3.本地数据库导出

```bash
# 导出单个表的数据
pg_dump -h localhost -U <local_user> -d <local_db> \
  --data-only --no-owner --no-privileges \
  -t <table_name> \
  -f /path/to/your/dump.sql

# 导出多个表
pg_dump -h localhost -U <local_user> -d <local_db> \
  --data-only --no-owner --no-privileges \
  -t table1 -t table2 -t table3 \
  -f /path/to/your/dump.sql

# 导出整个数据库（推荐）
pg_dump -h localhost -U <local_user> -d <local_db> \
  --data-only --no-owner --no-privileges \
  -f /path/to/your/dump.sql
```

**参数详细说明：**

| 参数              | 说明                                               |
| ----------------- | -------------------------------------------------- |
| `-h localhost`    | 指定数据库主机地址（本地为 localhost）             |
| `-U <local_user>` | 指定连接数据库的用户名                             |
| `-d <local_db>`   | 指定要导出的数据库名称                             |
| `--data-only`     | 只导出数据，不包含表结构定义（CREATE TABLE 等）    |
| `--no-owner`      | 不输出设置对象所有权的命令，避免权限问题           |
| `--no-privileges` | 不输出权限设置命令（GRANT/REVOKE），确保导入兼容性 |
| `-t <table_name>` | 指定要导出的表名（可重复使用以导出多个表）         |
| `-f <filename>`   | 指定输出文件路径                                   |

### 4.将导出的数据导入到Neon数据库

- 打开Neon的控制台，点击`Connect`
  {% include custom-image.html src="/assets/img/2025-08-16-neon-migration/connect.png" %}
- 选择`psql`，复制连接字符串
  {% include custom-image.html src="/assets/img/2025-08-16-neon-migration/connect-string.png" %}
- 在本地终端粘贴复制的连接字符串，并运行（下方命令仅为示例）
  ```bash
  psql "postgres://<neon_user>:<pwd>@<neon_host>/<neon_db>?sslmode=require&channel_binding=require"
  ```
- 进入psql交互界面后，运行以下命令导入数据
  ```bash
  \i /path/to/your/dump.sql
  ```
- 或直接通过管道导入
  ```bash
  psql "postgres://<neon_user>:<pwd>@<neon_host>/<neon_db>?sslmode=require&channel_binding=require" < /path/to/your/dump.sql
  ```

至此，数据已成功导入到Neon数据库中！接下来，便可以在Neon上进行进一步的开发和测试。
