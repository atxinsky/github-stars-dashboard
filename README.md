# GitHub Stars Dashboard

把 `atxinsky` 的 GitHub 收藏整理成能按任务查找、读懂价值、记录使用情况的个人开源工具库。

## 功能

- 从 `https://github.com/atxinsky?tab=stars` 拉取公开 starred repositories。
- 本地快照：`public/stars-snapshot.json` 保存最近一次写回仓库的公开收藏数据。
- 按“做网站、学习辅导、游戏与娱乐、内容创作、自动化、知识与研究、数据分析、设备工具”找项目，也可按用途类别、语言和采用建议筛选。
- 中文任务检索，例如“克隆网页”“学习资料生成练习”“Switch 苹果 游戏”，不必记住仓库名。
- 列表展示中文价值点评、适用场景、采用建议、使用门槛与原始来源；不以 Star 数代替质量评测。
- 项目说明已核对的评价与仅按简介/标签的初筛明确区分，均不冒充部署实测。
- 私人“待尝试 / 已用过 / 暂不考虑”清单与笔记仅保存在当前浏览器，可导出 JSON 并在另一设备导入。
- 手动同步公开收藏；每次访问仍检查服务器快照，离线时保留已有缓存，较旧快照不覆盖更新的手动同步。
- 已配置 GitHub Pages workflow，每天北京时间 09:17 自动刷新快照并部署静态页面。

## 本地使用

```bash
npm install
npm run dev
```

本地开发时点击 `同步收藏` 会优先走 Vite 本地 API，由本机脚本请求 GitHub；本地接口失败时会尝试浏览器直连 GitHub。

## 评价和私人记录

`src/reviews.ts` 保存已阅读官方项目说明的评价，包含核对日期、来源、适用场景与实际限制。`src/discovery.ts` 为未核对项目提供明确标注的简介初筛；定时刷新只更新 GitHub 元数据，不会假装已自动读完所有 README。新项目可立即参与分类与检索，详细评价需要补充来源。

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
  - cron: '17 1 * * *'
```

GitHub Actions 的 cron 使用 UTC，这等于每天北京时间 09:17。每次运行会重新执行 `npm run refresh:stars`，把最新 starred repositories 写入快照，然后重新构建并发布 GitHub Pages。也可以在 Actions 页面手动运行 `Deploy GitHub Pages`。

每次发布先执行缓存回归测试和 lint，再刷新数据、构建页面。成功部署后，如果仓库快照已至少 7 天没有保存，工作流会把这次已发布的真实快照提交回 `main`，保留每周的数据历史和仓库活动，避免长期只有部署、没有仓库活动导致定时任务再次闲置停用。写回使用内置 `GITHUB_TOKEN`，不会触发新的 `push` 工作流，因此不会循环部署；只有保存快照的 job 有仓库写权限。如果部署期间 `main` 已被其他提交更新，则跳过写回，交给后续运行处理，不覆盖新提交。

GitHub 对公开仓库实行[连续 60 天无活动自动停用定时任务](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)的规则。如果任务已经显示 `disabled_inactivity`，需要先在 Actions 页面重新启用，或执行 `gh workflow enable deploy.yml --repo atxinsky/github-stars-dashboard`，再手动运行一次。定时运行可能因 GitHub 排队稍有延迟；每天 09:17 是计划时间，不保证准点执行。
