<template>
  <a-card title="上传趋势">
    <v-chart autoresize :option="options" :loading="loading" class="chart" />
    <template #extra>
      <a-space wrap>
        <a-segmented v-model:value="timeDimension" :options="timeDimensionOptions" />
        <a-input-search
          v-model:value="userIdInput"
          placeholder="按用户 id 筛选"
          enter-button="筛选"
          allow-clear
          style="width: 220px"
          @search="doSearch"
        />
      </a-space>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { getSpaceUserAnalyze } from '@/api/spaceAnalyzeController'
import '@/plugins/echarts'
import { useChartTheme } from '@/composables/useChartTheme'

interface Props {
  spaceId?: string
  queryPublic?: boolean
  queryAll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  spaceId: undefined,
  queryPublic: false,
  queryAll: false,
})

const dataList = ref<API.SpaceUserAnalyzeResponse[]>([])
const loading = ref(true)
// 输入框的值和真正生效的筛选值分开：清空输入时要能真正把条件撤掉
const userIdInput = ref<string>()
const userId = ref<string>()
const timeDimension = ref('day')

const timeDimensionOptions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
]

const doSearch = (value: string) => {
  userId.value = value?.trim() || undefined
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceUserAnalyze({
      spaceId: props.spaceId,
      queryPublic: props.queryPublic,
      queryAll: props.queryAll,
      userId: userId.value,
      timeDimension: timeDimension.value,
    })
    if (res.data.code === 0) {
      dataList.value = res.data.data ?? []
    } else {
      dataList.value = []
      message.error('获取数据失败，' + res.data.message)
    }
  } finally {
    loading.value = false
  }
}

const chartTheme = useChartTheme()

const options = computed(() => ({
  textStyle: chartTheme.value.textStyle,
  tooltip: { trigger: 'axis', formatter: (params: any) => {
    const item = params?.[0]
    return item ? `${item.axisValue}<br/>上传：${item.value} 张` : ''
  } },
  grid: { left: 48, right: 24, top: 24, bottom: 40 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: dataList.value.map((item) => item.period ?? ''),
    axisLabel: { rotate: dataList.value.length > 12 ? 45 : 0 },
  },
  // 轴名画在轴顶端外侧，卡片里容易被裁；单位改由 tooltip 表达
  yAxis: { type: 'value', splitLine: chartTheme.value.splitLine },
  series: [
    {
      name: '上传数量',
      type: 'line',
      smooth: true,
      symbolSize: 6,
      areaStyle: { opacity: 0.08 },
      lineStyle: { width: 2 },
      itemStyle: { color: chartTheme.value.seriesColor },
      data: dataList.value.map((item) => item.count ?? 0),
      emphasis: { focus: 'series' },
    },
  ],
}))

watchEffect(fetchData)
</script>

<style scoped>
.chart {
  height: 320px;
  max-width: 100%;
}
</style>
