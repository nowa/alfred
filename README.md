# Alfred

Alfred 是运行在你自己机器上的个人 agent：通过 Telegram 或桌面 App 对话，到点主动提醒，读邮件、管日历；模型用 ChatGPT 订阅或 API key。这个仓库只放发布的程序和安装脚本。

Alfred is a personal agent that runs on your own machine. This repository holds its releases and its installer.

## 安装

macOS 和 Linux，arm64 和 amd64：

```bash
curl -fsSL https://github.com/nowa/alfred/releases/latest/download/install.sh | sh
```

脚本核对下载的包，把 `alfred` 和 `alfred-telegram` 装进 `~/.local/bin`，再运行 `alfred setup`：一问一答完成设置，不用写配置文件。在用 Hermes Agent 的，`alfred setup` 会提出把记忆、skill、定时任务、看板和对话搬过来。

跳过的设置，以后直接在对话里让 Alfred 补上。`alfred help` 列出全部命令，`alfred doctor` 说明哪一部分不正常。

## 升级

服务每天自己检查一次新版本，核对签名和哈希之后，等手上的事做完再换上新程序；新版本启动不了，就换回旧版本和升级前的数据。也可以随时运行 `alfred update`。

## 校验

每个 release 带 `SHA256SUMS` 和它的签名 `SHA256SUMS.sig`，签名是 OpenBSD signify 的格式。升级时 `alfred` 用内置的公钥核对签名，签名不对就不升级。
