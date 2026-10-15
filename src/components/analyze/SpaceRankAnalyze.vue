<template>
  <a-card title="空间使用排行（MB）">
    <v-chart autoresize :option="options" :loading="loading" class="chart" />
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { getSpaceRankAnalyze } from '@/api/spaceAnalyzeController'
import '@/plugins/echarts'

const TOP_N = 10

const dataList = ref<API.SpaceVO[]>([])
const loading = ref(true)

const fetchData = async () => {
  loading.value = true
  try {
    // 后端 SpaceRankAnalyzeRequest 只有 topN，查询范围参数它不接收
    const res = await getSpaceRankAnalyze({ topN: TOP_N })
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

watchEffect(fetchData)

const options = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const item = params?.[0]
      if (!item) {
        return ''
      }
      const space = dataList.value[item.dataIndex]
      return `${space?.spaceName || '未命名空间'}<br/>占用：${item.value} MB<br/>归属用户：${space?.userId ?? '-'}`
    },
  },
  grid: { left: 52, right: 24, top: 24, bottom: 76 },
  xAxis: {
    type: 'category',
    data: dataList.value.map((item) => item.spaceName || `空间 ${item.id}`),
    axisTick: { alignWithLabel: true },
    axisLabel: { interval: 0, rotate: 30, width: 88, overflow: 'truncate' },
  },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  series: [
    {
      name: '占用 (MB)',
      type: 'bar',
      barMaxWidth: 36,
      data: dataList.value.map((item) => Number((((item.totalSize ?? 0) / 1024 / 1024)).toFixed(2))),
      itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] },
    },
  ],
}))
</script>

<style scoped>
.chart {
  height: 320px;
  max-width: 100%;
}
</style>
