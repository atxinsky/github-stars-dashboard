// Hand-written, lively Chinese intros keyed by lower-case "owner/repo".
// Kept separate from public/project-reviews.json so the local Codex review job and the
// hourly Actions refresh never overwrite them. Facts come from each project's README/review.
export type ProjectIntro = { hook: string; intro: string; highlights: string[] }

export const PROJECT_INTROS: Record<string, ProjectIntro> = {
  'seedds/nxnative': {
    hook: '任天堂这不废了吗 😂 爱打游戏的有福了',
    intro: '一个新开源项目，把你自己的 Switch 游戏直接转成 Apple 原生应用，能跑在 iPhone、iPad，甚至 Mac 上。不是模拟器，而是把游戏代码重编译后用 Apple 芯片直接跑。',
    highlights: ['部分游戏的特定版本能跑到 60 帧', '图形走 Metal，原生适配 Apple 设备', '要自备游戏文件和 prod.keys，仓库不提供', '需要 Mac + Xcode 构建，首次构建可能 30–60 分钟'],
  },
  'hkuds/deeptutor': {
    hook: '港大开源的 AI 私教，学生党和自学党狂喜 📚',
    intro: '不是那种一问一答的聊天框。把课本、讲义丢进去，它就围绕你自己的资料讲题、出题、画图解，全在一个工作区里完成。',
    highlights: ['会记住你学到哪了，换个会话进度也接得上，还能看分层的学习记忆', '网课也能用：贴 B 站 / YouTube 链接，哪秒没听懂就问哪秒', '支持出练习题、做研究和可视化讲解', '建议先拿一门课的小批材料试效果'],
  },
  'jcodesmore/ai-website-cloner-template': {
    hook: '看中哪个网站？丢个网址，AI 帮你复刻一份 🪄',
    intro: '给 Claude Code、Codex 这类编码 AI 准备的一套“网站复刻流程”：先观察页面、提取图片素材，再重建成 Next.js 组件，最后拿截图对比修细节，产出能继续改的代码。',
    highlights: ['输出是可修改的 Next.js 项目，不是一张死截图', '用截图对照反复修正样式和交互', '适合迁移旧站、学习别人的布局', '只复刻前端外观，拿不到原站后端；请只用于自己或已授权的网站'],
  },
  'codecrafters-io/build-your-own-x': {
    hook: '想真正搞懂技术？那就自己造一个 🔧',
    intro: '程序员圈的神级清单：教你从零手写数据库、Git、Docker、编程语言、渲染器、网络协议……按主题整理了大量动手教程。',
    highlights: ['项目式学习，做完一个就懂一个原理', '覆盖几十个技术方向，多种编程语言', '适合想补系统底层的程序员和计算机学生', '只是教程入口，深度和质量因教程而异'],
  },
  'openclaw/openclaw': {
    hook: '在微信式聊天里使唤你的电脑 🦞',
    intro: '把个人 AI 助手常驻在自己的电脑上，通过 Telegram、Slack、WhatsApp 等聊天工具给它派活，日常琐事一句话交代。',
    highlights: ['自己部署，助手跑在你的机器上', '一个助手对接多个聊天入口', '有多个系统的原生应用', '建议先接一个渠道、做低风险小任务试水'],
  },
  'obra/superpowers': {
    hook: '给 AI 编程助手装上“工程师的脑子” 🧠',
    intro: '一套可组合的技能包，让编码 AI 先理清需求、再按步骤开发、最后自己验证，而不是一上来就乱写代码。',
    highlights: ['需求梳理 → 开发 → 验证 的固定流程', '技能可拆可组合，支持多种编码代理', '减少 AI 返工是目标，效果要用自己项目检验'],
  },
  'mattpocock/skills': {
    hook: 'TypeScript 大神的私房 AI 技能，小而精 ✨',
    intro: 'Matt Pocock 把日常软件工程方法拆成一个个独立小技能，哪里薄弱补哪里，不用整套大流程接管你的开发。',
    highlights: ['可当插件装，也可直接复制文件用', '每个技能独立、可改、可组合', '适合只想补一个短板的开发者'],
  },
  'deepseek-ai/deepseek-harness': {
    hook: 'DeepSeek 官方出的 AI 代理底座 🐋',
    intro: 'DeepSeek 开源的代理“宿主”框架，用插件拼装能力，适合想自己搭 AI 代理的开发者研究。',
    highlights: ['插件化架构（Cordis 驱动）', '官方明确是开发者预览版，可能有破坏性更新', '要固定版本使用，不是开箱即用的聊天工具'],
  },
  'nousresearch/hermes-agent': {
    hook: '会自己长技能、有长期记忆的个人 AI 代理 🪽',
    intro: 'Nous Research 出品：代理能从做过的事里总结技能、搜索历史会话、积累记忆，还能通过聊天软件远程使唤、跑定时任务。',
    highlights: ['模型可自选，执行环境多种', '支持消息平台远程交互和定时自动化', '长期记忆要定期清理，注意权限范围'],
  },
  'n8n-io/n8n': {
    hook: '开源版“自动化流水线”，打工人摸鱼神器 ⚙️',
    intro: '在画布上拖拖拽拽，把表格、邮件、通知、AI 模型和各种业务应用串成自动化流程，需要时还能插入 JavaScript / Python 代码。',
    highlights: ['可视化 + 代码混搭，灵活度高', '支持自托管，也有云端版', '能做带人工审批的 AI 工作流', '授权、失败重试这些仍需认真设计'],
  },
  'yt-dlp/yt-dlp': {
    hook: '视频下载界的瑞士军刀 🎬',
    intro: '命令行工具，支持海量网站的音视频和字幕下载，格式、清晰度随你挑，适合批量保存素材。',
    highlights: ['支持站点极多，参数丰富', '可脚本化批量下载', '能衔接转码、字幕、剪辑流程', '站点规则常变，个别网址可能失效'],
  },
  'firecrawl/firecrawl': {
    hook: '把任何网页变成 AI 能直接吃的资料 🔥',
    intro: '网页搜索、抓取、交互一条龙，输出干净的 Markdown、结构化 JSON 或截图，专门给 AI 代理和知识库喂数据。',
    highlights: ['省掉大量网页解析清洗工作', '有托管服务也有开源版', '复杂登录和动态页面要实测', '抓到不等于可以合法使用'],
  },
  'microsoft/markitdown': {
    hook: '微软出品：Word、PDF、PPT 一键转 Markdown 📄',
    intro: '轻量 Python 工具，把各种办公文档转成 AI 好读的 Markdown，做知识库、批量处理文档特别顺手。',
    highlights: ['多种文件格式统一转换', '保留标题、列表等结构', '表格、图片、扫描件转换效果需抽查'],
  },
  'anthropics/skills': {
    hook: 'Anthropic 官方技能库，教你给 Claude 写“操作手册” 📘',
    intro: '官方公开的一批技能示例，用说明 + 脚本 + 资源文件让 Claude 按专门流程处理文档、数据分析和自动化任务，也是自己写技能的参考模板。',
    highlights: ['官方示范，结构清晰', '可直接参考写自己的 SKILL.md', '各技能依赖和授权不同，挑小任务先试'],
  },
  'langgenius/dify': {
    hook: '国产明星 AI 应用搭建平台 🧩',
    intro: '模型管理、知识库问答（RAG）、工作流、AI 代理都放在一个可视化平台里，云端和私有部署都行，适合把业务 AI 原型做成真应用。',
    highlights: ['可视化编排，团队可协作', '支持自托管', '内部知识库问答很常用', '上线仍要考虑权限、错误处理和效果评估'],
  },
  'langflow-ai/langflow': {
    hook: '拖节点就能搭 AI 工作流，还能一键发布成 API 🧱',
    intro: '用图形界面拼模型、检索和工具节点，支持 Python 自定义组件，做好的流程能发布成 API 或 MCP 工具给别的应用用。',
    highlights: ['逐步测试，快速验证 RAG / 代理流程', '可发布为 API 或 MCP 工具', '生产环境需自己处理鉴权和费用'],
  },
  'anthropics/claude-code': {
    hook: '住在终端里的 AI 程序员 👨‍💻',
    intro: 'Anthropic 官方编码助手：读懂整个代码库，直接改文件、跑命令、处理 Git，用大白话把编程任务交给它。',
    highlights: ['终端、IDE、GitHub 多个入口', '能执行而不只是给建议', '记得看改动差异、跑测试再合并'],
  },
  'farion1231/cc-switch': {
    hook: '多个 AI 编程工具来回切模型？一个界面搞定 🔀',
    intro: '桌面小工具，集中管理 Claude Code 等多种编码客户端的 API 提供商、MCP、技能和提示词，点一下就切换，不用再手改 JSON / TOML。',
    highlights: ['图形界面切换配置', '统一查看 MCP 与技能', '切换前建议先备份配置'],
  },
  'comfy-org/comfyui': {
    hook: 'AI 绘图玩家的终极节点工作台 🎨',
    intro: '把模型、生成步骤、后处理连成节点图，流程可保存、可复用、可反复调参，是本地 AI 出图的热门工具。',
    highlights: ['节点化，生成过程一目了然', '有桌面版、便携版和云端', '插件多，排错成本也高，先从简单流程玩起'],
  },
  'github/spec-kit': {
    hook: 'GitHub 官方：先写清楚需求，再让 AI 写代码 📐',
    intro: '面向编码 AI 的“规范驱动开发”工具包，用模板把需求说明、实施计划、修复验证串起来，每一步都有记录。',
    highlights: ['从需求一路追踪到实现和验证', '有缺陷修复等现成流程', '小任务别为填文档而过度流程化'],
  },
}
