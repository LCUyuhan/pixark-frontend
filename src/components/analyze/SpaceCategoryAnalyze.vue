<template>
  <a-card title="图库分类占用">
    <v-chart autoresize :option="options" :loading="loading" class="chart" />
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { getSpaceCategoryAnalyze } from '@/api/spaceAnalyzeController'
import '@/plugins/echarts'

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

const dataList = ref<API.SpaceCategoryAnalyzeResponse[]>([])
const loading = ref(true)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceCategoryAnalyze({
      spaceId: props.spaceId,
      queryPublic: props.queryPublic,
      queryAll: props.queryAll,
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

watchEffect(fetchData)

// 单位写进图例而不是 yAxis.name —— 轴名画在轴顶端外侧，卡片里极易被裁
const options = computed(() => {
  const categories = dataList.value.map((item) => item.category ?? '未分类')
  const countData = dataList.value.map((item) => item.count ?? 0)
  const sizeData = dataList.value.map((item) => Number((((item.totalSize ?? 0) / 1024 / 1024)).toFixed(2)))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const lines = (params ?? []).map((p: any) => `${p.marker}${p.seriesName}：${p.value}`)
        return [params?.[0]?.axisValue ?? '', ...lines].join('<br/>')
      },
    },
    legend: { data: ['图片数量（张）', '图片总大小（MB）'], bottom: 0 },
    grid: { left: 48, right: 48, top: 24, bottom: 48 },
    xAxis: { type: 'category', data: categories, axisTick: { alignWithLabel: true } },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
      { type: 'value', position: 'right', splitLine: { show: false } },
    ],
    series: [
      { name: '图片数量（张）', type: 'bar', data: countData, yAxisIndex: 0, barMaxWidth: 28 },
      { name: '图片总大小（MB）', type: 'bar', data: sizeData, yAxisIndex: 1, barMaxWidth: 28, itemStyle: { color: '#91cc75' } },
    ],
  }
})
</script>

<style scoped>
.chart {
  height: 320px;
  max-width: 100%;
}
</style>
