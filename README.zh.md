# 🧪 birdcc-ci-test

> 每日同步真实 BIRD 配置快照，并用 GitHub Actions CI 持续测试 `setup-birdcc`

[![CI](https://github.com/bird-chinese-community/birdcc-ci-test/actions/workflows/ci.yml/badge.svg)](https://github.com/bird-chinese-community/birdcc-ci-test/actions/workflows/ci.yml) [![Sync Config Snapshots](https://github.com/bird-chinese-community/birdcc-ci-test/actions/workflows/sync-configs.yml/badge.svg)](https://github.com/bird-chinese-community/birdcc-ci-test/actions/workflows/sync-configs.yml) ![3 snapshots](https://img.shields.io/badge/快照-3-2563eb?style=flat-square) ![BIRD 2 and 3](https://img.shields.io/badge/BIRD-2%20%26%203-7c3aed?style=flat-square)

[English Version](./README.md) | 中文文档

> 概述 · 快照矩阵 · CI 覆盖面 · 每日同步 · Playground 演示 · 许可证说明

---

## 概述

`birdcc-ci-test` 是 [`bird-chinese-community/setup-birdcc`](https://github.com/bird-chinese-community/setup-birdcc) 的集成测试仓库。它不依赖于简单的手写测试用例，而是持续拉取并测试多个真实场景下的 BIRD 配置快照，每天通过 CI 验证 `setup-birdcc` 是否仍然能正常工作。

仓库的主要目标：

- 将上游的 BIRD 示例配置镜像到 `configs/`
- 记录镜像来源信息至 [`configs/ci-lock.json`](./configs/ci-lock.json)
- 运行 `birdcc fmt --check`、`birdcc lint --bird` 以及直接用 `bird -p -c` 解析检查
- 定时同步任务会触发完整 CI 流程，而不是跳过 CI 运行

## 快照矩阵

| 快照          | 上游来源                                                                            | BIRD 版本 | 本地入口                        | 说明                                                                           |
| ------------- | ----------------------------------------------------------------------------------- | --------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `sunyznet`    | [`SunyzNET/bird-config`](https://github.com/SunyzNET/bird-config)                   | 2         | `configs/sunyznet/bird.conf`    | 扁平多文件 include 结构，适合测试策略、filter、常量定义                        |
| `net186`      | [`186526/net186-config`](https://github.com/186526/net186-config)                   | 2         | `configs/net186/bird.conf`      | 包含 `bird/`、`lib/`、`protocol/`、`util/` 的多层目录，测试目录级 include 场景 |
| `bird3/nycm1` | [`tianshome/bird-configs-output`](https://github.com/tianshome/bird-configs-output) | 3         | `configs/bird3/nycm1/bird.conf` | BIRD3 真实配置，用于验证 formatter、parser 以及安装后的 BIRD3 二进制兼容性     |

## CI 覆盖面

| Workflow | 触发条件 | 验证内容 |
| --- | --- | --- |
| [`ci.yml`](./.github/workflows/ci.yml) | push / PR / 手动触发 | 对所有快照进行 format、lint 和 `bird -p -c` 解析检查 |
| [`changed-files.yml`](./.github/workflows/changed-files.yml) | PR 修改 `configs/**/*.conf` 或 `configs/**/*.bird` | 仅对变更文件做 format check，并重新运行受影响快照的 lint / parse |
| [`sync-configs.yml`](./.github/workflows/sync-configs.yml) | 每日 `02:00 UTC` / 手动触发 | 刷新上游快照、只提交真实差异，并显式派发 `ci.yml`，确保即使是 bot 推送也会跑每日金丝雀 CI |

所有工作流均使用 [`bird-chinese-community/setup-birdcc@main`](https://github.com/bird-chinese-community/setup-birdcc)，因此本仓库可视为该 Action 的持续集成验证环境。

## 每日同步

同步机制参考了 `BIRD-LSP` 中自动拉取配置示例的实现，目的是确保 CI 始终基于最新的 real-world 配置运行。

```mermaid
flowchart LR
  subgraph Upstream[上游 example config 来源]
    S1[SunyzNET<br/>BIRD2]
    S2[186526/net186-config<br/>BIRD2]
    S3[tianshome/bird-configs-output<br/>BIRD3]
  end

  Sync[sync-configs.mjs<br/>每日 02:00 UTC]
  Snapshots[(configs/ 快照)]
  CI[ci.yml<br/>lint · format · parse]
  Delta[changed-files.yml<br/>PR 增量检查]
  Playground[Playground 链接<br/>Shiki TextMate 演示]

  S1 --> Sync
  S2 --> Sync
  S3 --> Sync
  Sync --> Snapshots
  Snapshots --> CI
  Snapshots --> Delta
  Snapshots --> Playground
```

### 核心脚本

- [`scripts/config-sources-registry.mjs`](./scripts/config-sources-registry.mjs) 定义上游快照来源
- [`scripts/sync-configs.mjs`](./scripts/sync-configs.mjs) 负责克隆、更新、复制，必要时进行少量本地适配
- [`configs/ci-lock.json`](./configs/ci-lock.json) 记录当前镜像对应的上游 commit
- sync workflow 在刷新完成后会主动派发 [`ci.yml`](./.github/workflows/ci.yml)，因为单靠 `GITHUB_TOKEN` 触发的 bot push 并不能稳定带起普通 `push` workflow

如需增加新的配置来源：

1. 在 `scripts/config-sources-registry.mjs` 中添加来源定义
2. 如需额外处理，在 `scripts/sync-configs.mjs` 中补充安全的 post-sync 步骤
3. 执行 `node scripts/sync-configs.mjs`
4. 将新快照加入 CI matrix 和 README 表格

## Playground 演示

> [!NOTE]
> 由于 GitHub 不支持 BIRD 配置文件的语法高亮，因此本仓库提供了基于 [`BIRD` TextMate language grammar](https://github.com/bird-chinese-community/BIRD-tm-language-grammar) 的 Playground 链接，便于在线预览。

| 演示                       | 源文件                                                               | Playground                      |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| SunyzNET 常量 / bogon 策略 | [`configs/sunyznet/constant.conf`](./configs/sunyznet/constant.conf) | [打开演示][SunyzNET_Preview]    |
| net186 启动配置            | [`configs/net186/config.conf`](./configs/net186/config.conf)         | [打开演示][net186_Preview]      |
| BIRD3 `nycm1` 核心片段     | [`configs/bird3/nycm1/bird.conf`](./configs/bird3/nycm1/bird.conf)   | [打开演示][BIRD3_nycm1_Preview] |

演示链接内嵌简短示例，并在注释中保留源文件路径，便于追溯。

### 手动同步上游配置

```bash
cd /path/to/birdcc-ci-test
node scripts/sync-configs.mjs --verbose
```

## 许可证说明

本仓库主要用于镜像第三方 BIRD 配置快照，以支持 CI 测试和文档展示。

- 上游配置的版权及许可证归属原始仓库所有
- 当前镜像对应的上游 commit 记录在 [`configs/ci-lock.json`](./configs/ci-lock.json) 中
- `licenseSpdx: "NOASSERTION"` 表示初始化时未获取到明确的 SPDX 许可证标识

如需将这些快照用于其他目的，请先查阅上游仓库及其许可证条款，**本仓库不对镜像配置内容附加任何新的许可证声明**。

[SunyzNET_Preview]: https://textmate-grammars-themes.netlify.app/?theme=tokyo-night&grammar=bird2&code=%23%20From%20https%3A%2F%2Fgithub.com%2Fbird-chinese-community%2Fbirdcc-ci-test%2Fblob%2Fmain%2Fconfigs%2Fsunyznet%2Fconstant.conf%0A%0Adefine%20ASN_LOCAL%20%3D%20150289%3B%0A%0Adefine%20BOGON_ASNS%20%3D%20%5B%0A%20%20%20%200%2C%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%207607%0A%20%20%20%2023456%2C%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%204893%20AS_TRANS%0A%20%20%20%2064496..64511%2C%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%205398%20documentation%2Fexample%20ASNs%0A%20%20%20%2064512..65534%2C%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%206996%20Private%20ASNs%0A%20%20%20%2065535%2C%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%207300%20Last%2016%20bit%20ASN%0A%20%20%20%2065536..65551%2C%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%205398%20documentation%2Fexample%20ASNs%0A%20%20%20%2065552..131071%2C%20%20%20%20%20%20%20%20%20%20%23%20RFC%20IANA%20reserved%20ASNs%0A%20%20%20%204200000000..4294967294%2C%20%23%20RFC%206996%20Private%20ASNs%0A%20%20%20%204294967295%20%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%207300%20Last%2032%20bit%20ASN%0A%5D%3B%0A%0Adefine%20BOGON_PREFIXES_V4%20%3D%20%5B%0A%20%20%20%200.0.0.0%2F8%2B%2C%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%201122%20this%20network%0A%20%20%20%2010.0.0.0%2F8%2B%2C%20%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%201918%20private%20space%0A%20%20%20%20100.64.0.0%2F10%2B%2C%20%20%20%20%20%20%20%20%20%23%20RFC%206598%20Carrier%20grade%20NAT%20space%0A%20%20%20%20127.0.0.0%2F8%2B%2C%20%20%20%20%20%20%20%20%20%20%20%23%20RFC%201122%20localhost%0A%20%20%20%20169.254.0.0%2F16%2B%2C%20%20%20%20%20%20%20%20%23%20RFC%203927%20link%20local%0A%20%20%20%20172.16.0.0%2F12%2B%2C%20%20%20%20%20%20%20%20%20%23%20RFC%201918%20private%20space%0A%20%20%20%20192.168.0.0%2F16%2B%2C%20%20%20%20%20%20%20%20%23%20RFC%201918%20private%20space%0A%20%20%20%20224.0.0.0%2F4%2B%2C%20%20%20%20%20%20%20%20%20%20%20%23%20multicast%0A%20%20%20%20240.0.0.0%2F4%2B%20%20%20%20%20%20%20%20%20%20%20%20%23%20reserved%0A%5D%3B
[net186_Preview]: https://textmate-grammars-themes.netlify.app/?theme=tokyo-night&grammar=bird2&code=%23%20From%20https%3A%2F%2Fgithub.com%2Fbird-chinese-community%2Fbirdcc-ci-test%2Fblob%2Fmain%2Fconfigs%2Fnet186%2Fconfig.conf%0A%0Arouter%20id%2010.0.0.101%3B%0A%0Adefine%20LOCAL_ASN%20%3D%20200536%3B%0Adefine%20POP%20%3D%20101%3B%0Adefine%20REGION%20%3D%20100%3B%0Adefine%20SELFASN%20%3D%204200000101%3B%0Adefine%20ROUTER_IP%20%3D%202a0a%3A6040%3Aa901%3A%3A1%3B%0A%0Aprotocol%20static%20%7B%0A%20%20ipv4%3B%0A%20%20route%2010.0.0.0%2F24%20unreachable%3B%0A%7D%0A%0Aprotocol%20kernel%20%7B%0A%20%20ipv4%20%7B%0A%20%20%20%20import%20none%3B%0A%20%20%20%20export%20filter%20%7B%0A%20%20%20%20%20%20if%20source%20%3D%20RTS_STATIC%20then%20accept%3B%0A%20%20%20%20%20%20reject%3B%0A%20%20%20%20%7D%3B%0A%20%20%7D%3B%0A%7D
[BIRD3_nycm1_Preview]: https://textmate-grammars-themes.netlify.app/?theme=tokyo-night&grammar=bird2&code=%23%20From%20https%3A%2F%2Fgithub.com%2Fbird-chinese-community%2Fbirdcc-ci-test%2Fblob%2Fmain%2Fconfigs%2Fbird3%2Fnycm1%2Fbird.conf%0A%0Arouter%20id%2010.0.0.127%3B%0A%0Adefine%20LOCAL_v4%20%3D%20%5B%0A%20%2010.30.0.0%2F16%2B%2C%0A%20%2010.24.0.0%2F16%2B%2C%0A%20%20192.168.1.0%2F24%2B%0A%5D%3B%0A%0Afilter%20local_v4_only%20%7B%0A%20%20if%20dest%20%3D%20RTD_UNREACHABLE%20then%20reject%3B%0A%20%20if%20(net%20~%20LOCAL_v4)%20then%20accept%3B%0A%20%20reject%3B%0A%7D%3B%0A%0Aprotocol%20kernel%20kernel_v4%20%7B%0A%20%20learn%3B%0A%20%20ipv4%20%7B%0A%20%20%20%20import%20filter%20%7B%0A%20%20%20%20%20%20if%20net%20%3D%200.0.0.0%2F0%20then%20reject%3B%0A%20%20%20%20%20%20accept%3B%0A%20%20%20%20%7D%3B%0A%20%20%20%20export%20filter%20local_v4_only%3B%0A%20%20%7D%3B%0A%7D%0A%0Aprotocol%20bgp%20upstream4%20%7B%0A%20%20local%2010.30.0.2%20as%2065000%3B%0A%20%20neighbor%2010.30.0.1%20as%2065001%3B%0A%20%20ipv4%20%7B%0A%20%20%20%20import%20filter%20%7B%0A%20%20%20%20%20%20if%20(net%20~%20LOCAL_v4)%20then%20reject%3B%0A%20%20%20%20%20%20accept%3B%0A%20%20%20%20%7D%3B%0A%20%20%20%20export%20all%3B%0A%20%20%7D%3B%0A%7D
