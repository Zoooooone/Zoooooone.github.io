---
title: 打造个人代码审查体系：SonarQube + Claude Code 工作流搭建指南
date: 2025-10-21 14:00:00 +0900
categories: [Study notes, CI]
tags: [code quality, tutorial, github actions, claude code, sonarqube]
image: /assets/img/2025-10-21-code-quality-workflow/sonar_claude.jpg
---

## 前言

最近几个月我一直在工作之余尝试个人开发，得益于近年来涌现的琳琅满目的LLM工具，我可以轻松横跨多个以前从未涉猎的技术栈，快速搭建出一个完整的项目架构，并不断丰富其中的功能模块。但与此同时，受限于自己有限的技术理解和精力，我无法做到精通每一个细节，哪怕我时刻保持对代码质量的警惕，也难免会有疏漏。我渐渐意识到，仅靠我个人的审查能力难以保证整体代码库的健康。于是我开始思考，有没有什么办法能让一个我这样的独行侠开发者，也能享受到团队协作中代码审查的好处呢？

近些天来，我结合工作中的经验，探索了一种基于SonarQube和Claude Code的个人代码审查体系，旨在通过自动化工具提升代码质量，减轻个人审查负担，并最终实现一个可持续的开发流程。在这篇文章中，我会简单介绍SonarQube和Claude Code，并分享我是如何将它们集成到我的个人开发工作流中的。

## SonarQube

### SonarQube是什么？

SonarQube是一个开源的代码质量管理平台，广泛应用于企业级软件开发中。它[支持多种编程语言](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/overview)，能够自动检测代码中的潜在问题，如代码异味、重复代码、安全漏洞等。通过SonarQube，我们可以获得详尽的代码质量报告，帮助我们识别和修复问题，从而提升代码的可维护性和可靠性。

### SonarQube定价与计划

SonarQube Cloud（SonarCloud）提供免费和付费两种订阅计划，适用于不同规模的项目。  
根据官方文档 [Subscription plans](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans)，主要区别如下：

**Free（免费计划）**
- 支持分析公共仓库（Public Repos）无限量代码；
- 支持分析私有仓库（Private Repos），但上限为 **50,000 行代码（LOC）**；
- 提供完整的质量门（Quality Gate）、问题检测、历史趋势等核心功能；
- 适合个人开发者与开源项目使用。

**Team（付费计划）**
- 适用于私有项目或团队协作；
- 可选择 100k ～ 1.9M 行代码的配额；
- 提供更丰富的组织管理、规则自定义和团队权限控制功能；
- 按代码行数计费，可按需扩展。

详细信息可参考官方定价页面：[https://www.sonarsource.com/plans-and-pricing/](https://www.sonarsource.com/plans-and-pricing/)


### 如何使用SonarQube？

#### 1. 登录与授权

- 打开[SonarCloud](https://sonarcloud.io/)
- 点击右上角“Log in”，选择使用GitHub账号登录
- 首次登录时，SonarCloud会请求授权访问你的GitHub账户，点击“Authorize SonarCloud”完成授权

#### 2. 导入GitHub组织

参考: **[SonarCloud文档-导入GitHub组织](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/creating-organization/importing-github-organization)**

- 登录后，在欢迎界面选择 **Import an organization from GitHub**
- 按提示安装SonarCloud GitHub App到你的GitHub账户
- 在安装过程中选择要授权的仓库（可以是所有仓库或特定仓库），授权后即可在SonarCloud控制台中看到对应的组织

#### 3. 创建项目

参考: **[SonarCloud文档-创建项目](https://docs.sonarsource.com/sonarqube-cloud/getting-started/github)**

- 进入控制台，点击右上角的 **+** 按钮，选择 **Analyze new project**
- 在列表中选择你想要分析的GitHub仓库，点击 **Set Up**
- 系统会为该仓库创建一个独立的SonarQube项目

#### 4. 启用自动分析

- 在 **How do you want to analyze your project?** 页面中，选择 **Automatic analysis (No CI configuration needed)**
- SonarQube Cloud将自动在每次PR创建/更新时触发代码分析，并在PR中显示代码质量报告

> 通过这种方式，你无需手写 GitHub Actions 配置文件。
{: .prompt-info }

至此，你已经成功将SonarQube集成到你的GitHub仓库中。每当你创建或更新PR时，SonarQube都会自动分析代码并生成质量报告，帮助你及时发现和修复潜在问题。如果需要手动配置GitHub Actions，也可以参考[这篇文章](https://medium.com/%40rahulsharan512/integrating-sonarcloud-with-github-actions-for-secure-code-analysis-26a7fa206d40)。

## Claude Code

### Claude Code是什么？

**[Claude Code](https://www.claude.com/product/claude-code)** 是由 Anthropic 推出的智能编程助手，利用大语言模型理解代码上下文，帮助开发者编写、调试、重构与审查代码。它可在终端、IDE 或 GitHub PR 中提供自动化建议与代码改进，支持多种语言与环境，用于加速开发与提升代码质量。

### Claude API定价

Claude API 按 token 数量计费，主流模型价格如下（[官方定价](https://docs.anthropic.com/en/docs/about-claude/pricing)）：

| 模型 | 输入价格 | 输出价格 |
|:---|---:|---:|
| Claude 4.5 Sonnet | $3 / MTok | $15 / MTok |
| Claude 4.5 Haiku | $1 / MTok | $5 / MTok |

> MTok = 百万 tokens, 实测：约 +6,400 / −1,350 行 的 PR花费约 \$0.56
{: .prompt-info }

### 如何将Claude Code集成到GitHub PR中？

#### 1. 生成API key

- 前往[Claude页面](https://claude.ai/)，使用你想要的账号登录（支持Google等多种方式）
- 成功登陆后，点击左下角的头像，选择 **Learn more** → **API Console**
- 左侧导航栏中选择 **API keys** → **Create key**
- 为你的API key命名（如“GitHub PR Review”），点击 **Add** 生成
- 复制生成的API key，稍后在GitHub Actions中使用

#### 2. 配置GitHub Secrets

- 进入你的GitHub仓库，点击 **Settings** → **Secrets and variables** → **Actions**
- 点击 **New repository secret**
- 在 **Name** 字段中输入 `CLAUDE_API_KEY`，在 **Value** 字段中粘贴刚才复制的API key，点击 **Add secret** 保存

#### 3. 为GitHub安装Claude App

- 访问[Claude App页面](https://github.com/apps/claude)，点击 **Install** 按钮
- 选择安装到你的GitHub账户，并授权访问你想要集成的仓库
- 完成安装后，Claude App将能够在你的PR中提供代码审查建议

#### 4. 创建GitHub Actions工作流

考虑到Claude API的定价以及每次调用可能产生的费用，我选择只在特定情况下触发代码审查工作流，而不是在每次PR更新时都调用API。具体来说，我设置了两套工作流：

- **主工作流**：在PR ready for review时触发，进行全面的代码审查
- **手动触发工作流**：有需要时通过在pr中添加一个内容为 `/review` 的评论手动触发，进行与主工作流相同的审查，应用于PR更新后仍需要审查的情况

1. 主工作流，位于项目根目录的 `.github/workflows/claude-code-review.yml`：

    {% raw %}
    ```yaml
    name: Claude Code Review

    on:
      pull_request:
        types: [ready_for_review]

    concurrency:
      group: claude-review-${{ github.event.pull_request.number }}
      cancel-in-progress: true

    jobs:
      claude-review:
        if: ${{ !github.event.pull_request.draft }}
        runs-on: ubuntu-latest
        permissions:
          contents: read
          pull-requests: write
          id-token: write

        steps:
          - name: Checkout repository
            uses: actions/checkout@v4
            with:
              fetch-depth: 1

          - name: Run Claude Code Review
            uses: anthropics/claude-code-action@d8f249ecdfa45f54899e00f42672e02eb40933e9
            with:
              anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
              github_token: ${{ secrets.GITHUB_TOKEN }}
              prompt: |
                REPO: ${{ github.repository }}
                PR NUMBER: ${{ github.event.pull_request.number }}

                Analyze the changes in this PR and identify issues related to:
                - Potential bugs or issues
                - Performance
                - Security
                - Correctness

                If critical issues are found, list them briefly. If no issues are found, provide an approval signal.

                Keep responses concise. Only highlight critical issues that must be addressed. Skip minor details or code style unless they impact the above concerns.

                Note: The PR branch is already checked out. Use `gh pr comment` for top-level feedback. Use `mcp__github_inline_comment__create_inline_comment` to highlight specific code issues.
              claude_args: |
                --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr comment:*),Bash(gh pr list:*),Bash(gh issue view:*),Bash(gh issue list:*),Bash(gh search:*)"
    ```
    {% endraw %}

    > Tips:
    > - `concurrency` 配置确保在同一时间只有一个审查任务在运行，避免重复调用Claude API，节省费用。
    > - 使用sha256哈希值锁定action版本，确保工作流的稳定性和安全性。
    > - 在工作流中使用环境变量，避免硬编码敏感信息。
    > - `--allowedTools` 参数限制Claude Code可以调用的工具，提升安全性，遵循最小权限原则。
    {: .prompt-tip }

2. 手动触发工作流，位于项目根目录的 `.github/workflows/claude.yml`：

    {% raw %}
    ```yaml
    name: Claude Code Review (on /review comment)

    on:
      issue_comment:
        types: [created]

    concurrency:
      group: claude-review-comment-${{ github.event.issue.number }}
      cancel-in-progress: true

    jobs:
      comment-triggered-review:
        if: ${{ github.event.issue.pull_request && contains(github.event.comment.body, '/review') }}
        runs-on: ubuntu-latest
        permissions:
          contents: read
          pull-requests: write
          id-token: write

        steps:
          - name: Checkout repository
            uses: actions/checkout@v4
            
          - name: Checkout PR branch
            run: gh pr checkout ${{ github.event.issue.number }}
            env:
              GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

          - name: Run Claude Code Review
            uses: anthropics/claude-code-action@d8f249ecdfa45f54899e00f42672e02eb40933e9
            with:
              anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
              github_token: ${{ secrets.GITHUB_TOKEN }}
              prompt: |
                REPO: ${{ github.repository }}
                PR NUMBER: ${{ github.event.issue.number }}

                Analyze the changes in this PR and identify issues related to:
                - Potential bugs or issues
                - Performance
                - Security
                - Correctness

                Keep responses concise. Only highlight critical issues that must be addressed.
                Use `gh pr comment` for top-level feedback.
                Use `mcp__github_inline_comment__create_inline_comment` for line-level issues.
              claude_args: |
                --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr comment:*),Bash(gh pr list:*),Bash(gh issue view:*),Bash(gh issue list:*),Bash(gh search:*)"
    ```
    {% endraw %}

    > Tips:
    > - `trigger` 条件确保只有在PR中添加 `/review` 评论时才会执行审查，避免不必要的API调用。
    {: .prompt-tip }

## 实际效果

- 这是某次PR的SonarQube报告截图，通过SonarQube的质量报告，可以直观了解代码质量指标和趋势。

  {% include custom-image.html src="/assets/img/2025-10-21-code-quality-workflow/sonarqube.png" %}

  可以进一步查看具体的issue详情，SonarQube会指出代码中的潜在问题，例：

  {% include custom-image.html src="/assets/img/2025-10-21-code-quality-workflow/sonarqube_detail.png" %}

- 这是某次PR中Claude Code自动生成的审查评论，指出了当前代码中的潜在问题并能够提供改进建议。

  {% include custom-image.html src="/assets/img/2025-10-21-code-quality-workflow/claude.png" %}

## 总结

这篇文章介绍了如何将 SonarQube 与 Claude Code 集成到 GitHub Actions，让自动化工具代替团队成员承担起代码审查的职责，成为个人开发中至关重要的一道防线。
