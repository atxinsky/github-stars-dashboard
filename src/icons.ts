import { createElement } from 'react'
import { BookOpen, Bot, Braces, ChartNoAxesCombined, Clapperboard, Gamepad2, Globe, Layers, MonitorSmartphone, Search, ShieldCheck, WandSparkles, Workflow, Wrench } from 'lucide-react'

export const SCENE_ICONS = { 'build-web': Globe, learn: BookOpen, gaming: Gamepad2, content: Clapperboard, automation: Workflow, research: Search, data: ChartNoAxesCombined, devices: Wrench }

export function categoryIcon(category: string) {
  if (category.includes('游戏')) return Gamepad2
  if (category.includes('教育') || category.includes('学习')) return BookOpen
  if (category.includes('复刻')) return Globe
  if (category.includes('代理')) return Bot
  if (category.includes('设计')) return WandSparkles
  if (category.includes('数据')) return ChartNoAxesCombined
  if (category.includes('媒体')) return Clapperboard
  if (category.includes('自动化')) return Workflow
  if (category.includes('安全')) return ShieldCheck
  if (category.includes('移动')) return MonitorSmartphone
  if (category.includes('开发') || category.includes('前端')) return Braces
  return Layers
}

export function categoryIconElement(category: string, size = 18) {
  return createElement(categoryIcon(category), { size, strokeWidth: 1.7 })
}
