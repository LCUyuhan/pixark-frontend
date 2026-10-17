import { computed } from 'vue'
import { useThemeStore } from '@/stores/useThemeStore'

/**
 * echarts 画在 canvas 上，既读不到 CSS 变量，主题翻了也不会自动重绘。
 * 这里把主题翻成响应式片段，图表在 computed option 里引用它，切换时 option 重算，
 * v-chart 会 setOption 覆盖旧样式。
 *
 * 文字/网格线分别对应 tokens.css / dark.css 里的 --color-text-secondary 与
 * --color-border-secondary，系列色对应 --color-primary；改令牌时同步改这里。
 *
 * 只管文字、网格线和系列色：暗色下浅灰轴标签配 #141414 卡片可读，
 * 系列主色跟着品牌走黑白（亮主题近黑、暗主题浅灰）。tooltip 保持默认白底，可读。
 */
export function useChartTheme() {
  const themeStore = useThemeStore()

  return computed(() => {
    const dark = themeStore.isDark
    return {
      textStyle: { color: dark ? 'rgba(255, 255, 255, 0.62)' : '#737780' },
      splitLine: { lineStyle: { color: dark ? '#24262B' : '#F0F1F3' } },
      /** 图表主系列色：与 --color-primary 对齐 */
      seriesColor: dark ? '#E8E9EB' : '#17191D',
      /** 热度四档（深→浅）：词云等用颜色深浅承载"热度"信息的场景 */
      heatColors: dark
        ? ['#E8E9EB', '#8A8F98', '#4A4F58', '#2E3036']
        : ['#17191D', '#4A4F58', '#8A8F98', '#D8DADE'],
    }
  })
}
