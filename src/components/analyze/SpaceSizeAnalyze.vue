<template>
  <a-card title="图片大小分布">
    <v-chart autoresize :option="options" :loading="loading" class="chart" />
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import VChart from 'vue-echarts'
import { getSpaceSizeAnalyze } from '@/api/spaceAnalyzeController'
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

const dataList = ref<API.SpaceSizeAnalyzeResponse[]>([])
const loading = ref(true)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceSizeAnalyze({
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

// 后端固定返回 4 段（含 0 值段），0 值扇区没面积却会占图例，直接滤掉。
// 标签放扇区内部、图例移到右侧，避免外置标签引线画出卡片边界
const options = computed(() => {
  const items = dataList.value.filter((item) => (item.count ?? 0) > 0)
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.name}：${params.value} 张（${params.percent}%）`,
    },
    legend: { orient: 'vertical', right: 16, top: 'middle', itemGap: 14 },
    series: [
      {
        name: '图片大小',
        type: 'pie',
        radius: ['42%', '62%'],
        center: ['34%', '50%'],
        label: { position: 'inside', formatter: '{d}%', fontSize: 11, color: '#fff' },
        labelLine: { show: false },
        data: items.map((item) => ({ name: item.sizeRange ?? '', value: item.count ?? 0 })),
      },
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
