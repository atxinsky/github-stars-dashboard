# GitHub Stars Dashboard

把 `atxinsky` 的 GitHub 收藏整理成能按任务查找、读懂价值、记录使用情况的个人开源工具库。

## 功能

- 从 `https://github.com/atxinsky?tab=stars` 拉取公开 starred repositories。
- 即使本机 GitHub 登录能看到私有收藏，也只返回和发布明确为公开的仓库；旧浏览器缓存、来源采集和评价目录另有校验。发布前移除不在当前公开收藏中的评价。
- 本地快照：`public/stars-snapshot.json` 保存最近一次写回仓库的公开收藏数据。
- 按“做网站、学习辅导、游戏与娱乐、内容创作、自动化、知识与研究、数据分析、设备工具”找项目，也可按用途类别、语言和采用建议筛选。
- 中文任务检索，例如“克隆网页”“学习资料生成练习”“Switch 苹果 游戏”，不必记住仓库名。
- 列表展示中文价值点评、适用场景、采用建议、使用门槛与原始来源；不以 Star 数代替质量评测。
- 项目说明已核对的评价与仅按简介/标签的初筛明确区分，均不冒充部署实测。
- 私人“待尝试 / 已用过 / 暂不考虑”清单与笔记仅保存在当前浏览器，可导出 JSON 并在另一设备导入。
- 手动同步公开收藏；每次访问仍检查服务器快照，离线时保留已有缓存，较旧快照不覆盖更新的手动同步。
- 已配置 GitHub Pages workflow，每小时第 17 分钟自动刷新收藏快照并部署静态页面。

## 本地使用

```bash
npm install
npm run dev
```

本地开发时点击 `同步收藏` 会优先走 Vite 本地 API，由本机脚本请求 GitHub；本地接口失败时会尝试浏览器直连 GitHub。

## 评价和私人记录

`public/project-reviews.json` 保存由 Codex 阅读真实 README 后撰写的详细评价，记录来源路径、README SHA、输入哈希、模型、提示版本和核对日期；`src/reviewCatalog.ts` 是前端与校验命令共用的格式契约。README 确实不存在（GitHub 返回 404）时才使用明确标注的仓库元数据来源，不能编造 README 引文。新收藏尚未完成评价时会显示待评价，不把按简介/标签的初筛冒充详细评测。

详细评价由本机 Codex 自动任务增量生成，使用现有 Codex 账号与额度，不额外接入 DeepSeek 等模型 API，也不配置新的模型密钥。GitHub Actions 只同步公开收藏、检查已有评价目录和发布页面。Codex 本地任务需要这台电脑开机、Codex 可以运行、GitHub 登录有效且网络可用；电脑离线时，新收藏仍能同步到页面，但详细评价会暂时待补。具体写作规范与本地任务步骤见 [REVIEW_GUIDE.md](REVIEW_GUIDE.md)。

```bash
npm run prepare:reviews              # 通过已有 gh 登录获取或复用 README 来源
npm run validate:reviews             # CI 校验；允许新收藏明确待评价
npm run validate:reviews -- --strict  # 发布完整评价前要求当前收藏全部覆盖
```

来源缓存位于 `.cache/review-sources/<仓库ID>.json`，索引为 `.cache/review-sources/index.json`；这些文件不会提交。缓存包含完整 README 和来源链接，每次最多 4 个请求，每个请求限时且重试有上限。代码推送会触发 README 重新核查；只有 README 或用途、许可证等相关元数据改变时，输入哈希才变化并要求更新评价，Star 数变化不会重写评价。403、429 和网络故障均记为来源读取失败，不会伪装成 README 不存在。

状态和笔记使用带版本的本地存储，不会上传到公开仓库或服务器。切换项目状态会同时保存正在编辑的笔记。导出清单包含项目、评价、状态和笔记，**不包含 GitHub Token**。导入仅接收经过全量校验的状态和笔记，合并已有记录；同一项目以导入记录为准。浏览器清理站点数据会清除本地记录，请按需导出备份。

```bash
npm test       # 分类、语义检索、证据边界、私人备份和缓存回归
npm run lint
npm run build  # TypeScript 检查及生产构建
```

## 手动刷新快照

未登录 GitHub API 每小时只有 60 次额度。可以用 token 提升额度：

```bash
GITHUB_TOKEN=你的token npm run refresh:stars
```

## 部署到 GitHub Pages

项目已经包含 `.github/workflows/deploy.yml`。推到 GitHub 后，Actions 会构建并部署到：

```text
https://atxinsky.github.io/github-stars-dashboard/
```

第一次发布：

```bash
gh auth login
gh repo create atxinsky/github-stars-dashboard --public --source=. --remote=origin --push
```

如果 GitHub Pages 没有自动启用，在仓库 Settings -> Pages 里把 Source 设为 `GitHub Actions`，然后重新运行 `Deploy GitHub Pages` workflow。

## 自动更新

`.github/workflows/deploy.yml` 里配置了定时任务：

```yaml
schedule:
  - cron: '17 * * * *'
```

GitHub Actions 每小时第 17 分钟执行 `npm run refresh:stars`，同步公开收藏，再运行 `npm run validate:reviews` 检查已有评价记录，重新构建并发布 GitHub Pages。也可以在 Actions 页面手动运行 `Deploy GitHub Pages`。线上 workflow 不生成评价，也没有外部模型密钥。

每次发布先执行缓存回归测试和 lint，再刷新数据、构建页面。成功部署后，如果仓库快照已至少 7 天没有保存，工作流会把这次已发布的真实快照提交回 `main`，保留每周的数据历史和仓库活动，避免长期只有部署、没有仓库活动导致定时任务再次闲置停用。写回使用内置 `GITHUB_TOKEN`，不会触发新的 `push` 工作流，因此不会循环部署；只有保存快照的 job 有仓库写权限。如果部署期间 `main` 已被其他提交更新，则跳过写回，交给后续运行处理，不覆盖新提交。

GitHub 对公开仓库实行[连续 60 天无活动自动停用定时任务](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)的规则。如果任务已经显示 `disabled_inactivity`，需要先在 Actions 页面重新启用，或执行 `gh workflow enable deploy.yml --repo atxinsky/github-stars-dashboard`，再手动运行一次。每小时第 17 分钟是计划时间，GitHub 排队可能导致延迟，不保证准点执行。
