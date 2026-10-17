<template>
  <a-card title="图库标签热度">
    <v-chart v-if="loading || dataList.length" autoresize :option="options" :loading="loading" class="chart" />
    <div v-else class="empty-tip">还没有带标签的图片</div>
    <template #extra>
      <span class="legend-hint">字号与颜色越深 = 使用越多</span>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { getSpaceTagAnalyze } from '@/api/spaceAnalyzeController'
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

const dataList = ref<API.SpaceTagAnalyzeResponse[]>([])
const loading = ref(true)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceTagAnalyze({
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

const chartTheme = useChartTheme()

// 同一色相分四档深浅：颜色在这里承载"热度"信息，而不是装饰。档位随主题翻（canvas 读不到 CSS 变量）
const colorOf = (count: number, max: number) => {
  const colors = chartTheme.value.heatColors
  if (!max) {
    return colors[3]
  }
  const ratio = count / max
  if (ratio >= 0.6) {
    return colors[0]
  }
  if (ratio >= 0.35) {
    return colors[1]
  }
  return ratio >= 0.15 ? colors[2] : colors[3]
}

const options = computed(() => {
  const max = dataList.value.reduce((acc, item) => Math.max(acc, item.count ?? 0), 0)
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}：${params.value} 张`,
    },
    series: [
      {
        type: 'wordCloud',
        gridSize: 6,
        sizeRange: [12, 34],
        // 不旋转：中文竖排可读性差，且旋转后极易互相压字
        rotationRange: [0, 0],
        shape: 'circle',
        width: '96%',
        height: '92%',
        data: dataList.value.map((item) => {
          const count = item.count ?? 0
          return {
            name: item.tag ?? '',
            value: count,
            textStyle: { color: colorOf(count, max) },
          }
        }),
      },
    ],
  }
})

watchEffect(fetchData)
</script>

<style scoped>
.chart {
  height: 320px;
  max-width: 100%;
}

.legend-hint {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.empty-tip {
  height: 320px;
  line-height: 320px;
  color: var(--color-text-disabled);
  text-align: center;
}
</style>
