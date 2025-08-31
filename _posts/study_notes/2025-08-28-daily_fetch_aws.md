---
title: AWS 实战记录：部署一个每日定时拉取数据的任务
date: 2025-08-28 0:00:00 +0900
categories: [Study notes, AWS]
tags: [aws, terraform]
---

## 背景

最近在个人开发的项目中，我需要实现这样一个功能：每天定时利用某个API拉取数据并存储到云端的数据库中，每次的任务执行时长大约在15-30分钟之间。

最初，我用的是Windows系统的任务计划程序（Task Scheduler）来实现这个功能。只需要指定好执行的脚本路径和时间，任务就能按时运行，算是一个最小化的解决方案。但是它显然有很大的局限性，例如当电脑进入休眠状态时任务就经常无法顺利执行。

后来，我将任务迁移到了本地启动的Docker容器中，把定时拉取的逻辑放在应用进程内，利用Python的`schedule`库来实现定时任务调度。这样只要容器一直在运行，任务就可以按时执行，解决了电脑休眠的问题。但仍需手动启动容器，并且确保容器不会意外停止。本质上还是依赖于本地环境。

因此，这个问题的最终的解决方案必须是将整个任务流程部署到云端的服务器上，利用云服务商提供的基础设施来保证任务的稳定运行，从而彻底摆脱对本地环境的依赖。可以实现这一点的方案有很多种，而出于个人学习需求，最终将技术选型锁定在AWS的生态中（数据库除外，RDS和Aurora的定价对于我目前的预算来说并不友好）。

## AWS技术选型

在AWS中，仍然有多种方式可以实现定时任务的调度和执行，例如：

- AWS Lambda + Amazon EventBridge
- Amazon EC2 + cron
- AWS ECS (on Fargate) + Amazon EventBridge

但仔细考虑每种方案的话，Lambda最轻量级，但运行时长不能超过15分钟，显然无法满足我的任务需求；EC2虽然灵活，但是自己运维成本太高，且任务本身没有长期运行的需求，因此也不太合适。而Fargate则是一个无服务器的容器服务，可以按需运行容器，并且可以通过EventBridge来实现定时触发，非常适合我的场景，所以我最终选择了这一方案。更加详细的架构设计如下（目前算是初版）：

- **调度**: AWS EventBridge 定时触发
- **运行环境**: AWS ECS (on Fargate)
- **存储**: 外部数据库 (PostgreSQL on Neon)
- **日志与监控**: AWS CloudWatch

{% include custom-image.html src="/assets/img/2025-08-28-daily_fetch_aws/fetch.svg" %}

在每天的指定时刻，AWS EventBridge会触发一个事件，进而启动 AWS ECS中的容器任务。该任务会执行数据拉取的逻辑，并将结果存储到外部数据库中。同时，任务的执行日志和监控信息会发送到 AWS CloudWatch的日志组中。

## 具体实现

具体的配置采用了Terraform来实现基础设施即代码（IaC），这样可以更方便地管理和复用配置。主要的配置文件包括：

```
infra
├── data.tf
├── ecr.tf
├── ecs_task.tf
├── ecs.tf
├── iam.tf
├── logs.tf
├── main.tf
├── outputs.tf
├── scheduler.tf
├── security_groups.tf
└── variables.tf
```

按组织结构划分的话，可以将这些文件分为以下几个层次：

- 基础设施层
  - `main.tf`: 定义AWS提供商和全局配置
  - `variables.tf`: 定义输入变量
  - `data.tf`: 定义数据源

- 权限和安全层
  - `iam.tf`: 定义IAM角色和策略
  - `security_groups.tf`: 定义安全组

- 存储和日志层
  - `ecr.tf`: 定义ECR镜像仓库
  - `logs.tf`: 定义CloudWatch日志组

- 计算层
  - `ecs.tf`: 定义ECS集群和服务
  - `ecs_task.tf`: 定义ECS任务定义

- 调度层
  - `scheduler.tf`: 定义EventBridge规则

下面简单说说关键配置项（代码仅涉及核心部分，省略了其他辅助配置）：

### 网络配置

- 使用默认的VPC和子网，子网均为公有，便于任务访问外部API和数据库
- 安全组仅设置出站流量

### IAM权限设计

- **ECS任务执行角色**：负责拉取容器镜像和写入CloudWatch日志 
  ```hcl
  resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
    role       = aws_iam_role.ecs_task_execution.name
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  }
  ```

  使用AWS托管的 **[AmazonECSTaskExecutionRolePolicy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html)** 包含拉取ECR镜像和写入CloudWatch日志的权限。

- **ECS任务角色**：供容器内的进程使用
  ```hcl
  resource "aws_iam_role" "ecs_task" {
    assume_role_policy = aws_iam_role.ecs_task_execution.assume_role_policy
  }
  ```

  容器内的进程将使用该角色。当前未配置任何权限，未来会根据需要添加访问其他AWS服务的权限。

- **EventBridge调度器角色**：负责定时启动ECS任务
  ```hcl
  resource "aws_iam_role_policy" "scheduler-policy" {
    role = aws_iam_role.scheduler.id
    
    policy = jsonencode({
      Statement = [
        {
          Effect = "Allow"
          Action = ["ecs:RunTask"]
          Resource = [aws_ecs_task_definition.fetch.arn, "${replace(aws_ecs_task_definition.fetch.arn, "/:\\d+$/", "")}:*"]
          Condition = { ArnLike = { "ecs:cluster" = aws_ecs_cluster.main.arn } }
        },
        {
          Effect = "Allow"
          Action = ["iam:PassRole"]
          Resource = [aws_iam_role.ecs_task_execution.arn, aws_iam_role.ecs_task.arn]
        }
      ]
    })
  }
  ```

  该角色只允许在指定集群运行本项目的任务定义，并且只允许将 ExecutionRole 和 TaskRole 传递给任务，确保调度器的权限范围最小化。

### ECS任务定义

```hcl
resource "aws_ecs_task_definition" "fetch" {
  family                   = "fetch"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
}
```

这里在任务定义中绑定了之前创建的两个IAM角色：ExecutionRole和TaskRole，并设置了任务的基本规格（CPU、内存等）。

### EventBridge调度配置

```hcl
resource "aws_scheduler_schedule" "daily_fetch" {
  schedule_expression          = "cron(30 2 * * ? *)"
  schedule_expression_timezone = "Asia/Tokyo"

  target {
    role_arn = aws_iam_role.scheduler.arn
    task_definition_arn = aws_ecs_task_definition.fetch.arn_without_revision
  }
}
```

将任务设置为每天凌晨2：30（东京时间）触发一次，调度器带入SchedulerRole来运行集群中最新的任务定义。

## 验证并部署

在完成Terraform配置后，可以通过以下命令进行验证：

```bash
cd infra
terraform init
terraform plan
```

如果没有问题，便可以执行部署：
```bash
terraform apply
```

## 未来计划

目前的配置已经基本满足了自动化数据拉取的需求，但仍有一些改进空间，比如：

- 任务失败时的触发告警并生成通知
  - **EventBridge调度失败的情况**：将失败事件投递到Amazon SQS（死信队列），再通过Amazon SNS发送邮件进行通知
  - **ECS任务执行失败的情况**：配合CloudWatch Alarms监控任务状态，并在任务失败时触发SNS通知

- 环境变量中的敏感信息使用AWS Secrets Manager进行管理
