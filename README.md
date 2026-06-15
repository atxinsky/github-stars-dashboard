# GitHub Stars Dashboard

用来梳理 `atxinsky` GitHub stars 的功能索引。分类按用途判断，例如 AI 代理、LLM 应用、设计/UI/创意工具、前端组件、自动化、数据/交易等，而不是按仓库使用的编程语言。

## 功能

- 从 `https://github.com/atxinsky?tab=stars` 拉取公开 starred repositories。
- 本地快照：`public/stars-snapshot.json` 当前包含 486 个仓库。
- 支持按功能分类、状态、语言、主题筛选。
- 每个功能分类都有简介，仓库详情里有“功能判断”说明。
- 支持导出 JSON，支持手动更新。
- 已配置 GitHub Pages workflow，每天北京时间 09:17 自动刷新快照并部署静态页面。

## 本地使用

```bash
npm install
npm run dev
```

本地开发时点击 `更新` 会优先走 Vite 本地 API，由本机脚本请求 GitHub；如果浏览器直连 GitHub 失败，也不影响本地更新。

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
