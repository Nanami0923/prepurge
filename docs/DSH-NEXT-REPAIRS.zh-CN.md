
# DSH NEXT 本机兼容修复（2026-11-09）

本 Fork 保留原作者、许可证与上游历史，记录从 Yangheyu123/prepurge 的 abb0fe807b63f5e4fba67a4801c61759cdbc9d23 验证的本机修复。

## 1. unknown prompt variable "{{cwd}}"

清洗宿主后 cwd 的注册点消失，但 personaSuffix 仍引用它，严格模板渲染因而失败。
在 lib/index.js 的 installCwdCapture(ctx) 中补回变量注册：先尝试 ctx.systemPrompt.ctx，再回退 ctx；使用 context?.agent?.session?.header?.cwd 取值。不存在 variable 方法时继续尝试下一宿主，已注册时停止，异常不阻断插件挂载。保留原有 persona 模板。

## 2. 界面误判 Web / 插件根未找到

DSH NEXT 的程序名和安装目录没有被原有桌面识别规则覆盖。lib/surface.js 与 lib/desktop.js 增加 DSH NEXT 的程序名、路径、默认安装位置和可执行文件候选，保留原有识别规则。

DSH_BASE 必须指向直接包含 dsh-agent-instructions/lib 的目录，而不是 resources/app：

```powershell
$base = Join-Path $env:LOCALAPPDATA 'Programs\DSH NEXT\resources\app\node_modules\@deepseek-ai'
Test-Path (Join-Path $base 'dsh-agent-instructions\lib')
[Environment]::SetEnvironmentVariable('DSH_BASE', $base, 'User')
```

设置后完整退出并重新启动客户端。环境变量只帮助定位，不能替代桌面类型识别。

## 3. 清洗没有写进全部宿主，已取消重启

本机实际枚举到一个宿主。第 40 号 COMPLETE_PROMPT_KEEP_INJECT 补丁对新版分支未匹配，状态为 skipped，导致完整性检查失败。
新版分支同时包含 tools 和 requiredContexts。lib/core.js 增加该构建的匹配项，复用既有 section 保留逻辑，同时保留 tools 与必需上下文过滤；旧版匹配项继续保留。此匹配项针对本机验证过的构建，不保证所有未来格式变化都能匹配。

没有绕过完整性门禁。修复后 ensureHostClean() 返回 ok:true、pending:[]、hosts 数量 1；修改后的宿主通过 node --check。

## 验证

```sh
node --test tests/desktop-next.test.mjs
node --check lib/index.js
node --check lib/core.js
node --check lib/surface.js
node --check lib/desktop.js
```

测试覆盖 DSH NEXT 的桌面识别、普通 Node 的 Web 识别，以及第 40 号补丁在完整/普通提示词与上下文抑制组合下的工具、section 和必需上下文保留。
本机客户端重启后进程正常响应；尚未自动验证可视化面板或真实模型请求。

## 其他历史故障的处理边界

凭据 version 必须是数字 1 的问题、残缺解包树、空文件、源代码目录被误扫描、app.asar 锁定与切换循环，属于用户提供的 2026-11-01 故障记录，本次未证实重现，因此未自动修改凭据、删除目录或改名封存 app.asar。

遇到相同症状应先确认具体受影响路径和备份：对空文件恢复可信原版；凭据只改类型而不暴露内容；切换 app.asar 前结束宿主并确认解包树完整；不要通过绕过完整性检查强制重启。

## 回滚

安装前备份原插件包和宿主。回滚本 Fork 时恢复对应原版插件文件；已应用的宿主修改应使用插件“还原”功能及其原始备份。不要混用不同构建的宿主文件。本仓库不包含本机凭据、聊天记录、机器备份或 node_modules。
