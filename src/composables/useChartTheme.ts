import { computed } from 'vue'
import { useThemeStore } from '@/stores/useThemeStore'

/**
 * echarts 画在 canvas 上，既读不到 CSS 变量，主题翻了也不会自动重绘。
 * 这里把主题翻成响应式片段，图表在 computed option 里引用它，切换时 option 重算，
 * v-chart 会 setOption 覆盖旧样式。
 *
 * 两个值分别对应 tokens.css / dark.css 里的 --color-text-secondary 与 --color-border-secondary，
 * 改令牌时同步改这里。
 *
 * 只管文字和网格线：暗色下 rgba(0,0,0,.65) 的轴标签在 #141414 卡片上几乎看不见，
 * 而 #f0f0f0 的网格线会亮得刺眼。tooltip 保持默认白底，可读，只是不够好看。
 */
export function useChartTheme() {
  const themeStore = useThemeStore()

  return computed(() => {
    const dark = themeStore.isDark
    return {
      textStyle: { color: dark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)' },
      splitLine: { lineStyle: { color: dark ? '#303030' : '#f0f0f0' } },
    }
  })
}
