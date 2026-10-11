---
title: Windows系统下清理Docker占用的磁盘空间
date: 2025-09-07 19:17:00 +0900
categories: [Study notes, Docker]
tags: [docker, windows, wsl2, tutorial]
---

## 前言

在使用Docker一段时间过后，可能会积累大量的镜像、容器、卷和构建缓存，占用较多的磁盘空间， 因此我打算用这篇文章记录一下如何在Windows系统下清理不必要的Docker资源以释放磁盘空间。

## 背景

Docker占用的磁盘空间主要来自以下几个方面：

- **镜像(Image)**: 在日常不断地拉取和构建镜像的过程中堆积的镜像文件
- **容器(Container)**: 停止或未使用的容器
- **卷(Volume)**: 用于持久化数据的卷
- **构建缓存(Build Cache)**: 在构建镜像时产生的缓存文件

其中，卷中有可能涉及数据库以及其他持久化存储的数据，需要谨慎清理；此外如果有频繁构建镜像的需求，构建缓存也应考虑保留。所以我们主要是针对镜像和容器进行清理。

Windows系统下，Docker通常使用WSL2。WSL2本质上是一个虚拟机，而Docker的所有数据都存储在WSL2的虚拟磁盘中（以`.vhdx`文件的形式），随着时间的推移，这个虚拟磁盘会自动扩容，但并不会自动收缩，因此需要手动进行清理和压缩。

PS: 我的系统环境为Windows 11 家庭版 23H2，Docker版本为Docker Desktop 4.45.0 (203075)。Windows家庭版不支持Hyper-V，所以之后压缩虚拟磁盘的步骤需要使用`diskpart`命令。

## 清理步骤

### 0. 确认当前Docker的磁盘使用情况

```powershell
docker system df
```

### 1. 清理未使用的资源

```powershell
docker container prune && docker image prune -a
```

更完整的常用清理命令及其作用范围如下：

| 命令 / 参数 | 删除对象范围 | 说明 / 风险 |
| :---: | :--- | :--- |
| `docker image prune` | 悬空镜像 (`<none>`) | 仅删 dangling 层，安全。 |
| `docker image prune -a` | 未被任何容器引用的镜像 | 需重拉/重建，运行中容器依赖的不会删。 |
| `docker container prune` | 已停止容器 | 不影响运行中容器。 |
| `docker volume prune` | 未使用卷 | 会删数据，谨慎使用。 |
| `docker network prune` | 未使用自定义网络 | 不含默认网络，一般安全。 |
| `docker system prune` | 停止容器、未用网络、悬空镜像、可回收缓存 | 常用清理，不含卷。 |
| `docker system prune -a` | 停止容器、未用网络、未引用镜像、缓存 | 更彻底，不含卷。 |
| `docker system prune --volumes` | 同上 + 未用卷 | 最激进，卷数据会丢失。 |
| `docker builder prune` | 可回收构建缓存 | 可能影响 build 速度。 |
| `docker builder prune -a` | 所有构建缓存 | 最彻底，后续 build 变慢。 |
| `-f` / `--force` | 跳过确认提示 | 脚本常用，交互下慎用。 |


### 2. 定位WSL2的虚拟磁盘文件

```powershell
Get-ChildItem -Path $env:LOCALAPPDATA -Filter *.vhdx -Recurse -ErrorAction SilentlyContinue
```

可能的路径为 `C:\Users\<YourUsername>\AppData\Local\Docker\wsl\disk\docker-data.vhdx`

### 3. 压缩WSL2的虚拟磁盘

- 首先，退出Docker Desktop，确保没有任何WSL2实例在运行。
- 以管理员身份打开PowerShell，运行以下命令：

```powershell
wsl --shutdown
diskpart
```

- 在`diskpart`中，依次输入以下命令：

```plaintext
select vdisk file="C:\Users\<YourUsername>\AppData\Local\Docker\wsl\disk\docker-data.vhdx"
attach vdisk readonly
compact vdisk
detach vdisk
exit
```

这样执行完毕后，WSL2的虚拟磁盘就会被压缩，可以在系统中查看磁盘空间的变化。