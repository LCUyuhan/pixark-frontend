/**
 * echarts 按需注册：只装分析页真正用到的图表和组件，避免把全量 echarts 打进首屏。
 * 新增图表类型时记得在这里补 use()，否则 v-chart 会渲染出空白。
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
// 词云注册在 echarts 核心实例上，与上面的按需注册同源，不会额外拉入全量包
import 'echarts-wordcloud'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
])
