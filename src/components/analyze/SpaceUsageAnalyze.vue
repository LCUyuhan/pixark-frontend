<template>
  <a-card title="空间资源使用" :loading="loading" class="usage-card">
    <div class="usage-body">
      <a-flex gap="large" wrap class="gauges">
        <div class="gauge">
          <a-progress type="dashboard" :percent="data.sizeUsageRatio ?? 0" :width="116" :stroke-color="ratioColor" />
          <div class="gauge-label">存储空间</div>
          <div class="gauge-value">{{ formatSize(data.usedSize) }} / {{ data.maxSize ? formatSize(data.maxSize) : '无限制' }}</div>
        </div>
        <div class="gauge">
          <a-progress type="dashboard" :percent="data.countUsageRatio ?? 0" :width="116" :stroke-color="ratioColor" />
          <div class="gauge-label">图片数量</div>
          <div class="gauge-value">{{ data.usedCount ?? 0 }} / {{ data.maxCount ?? '无限制' }}</div>
        </div>
      </a-flex>

      <!-- 右侧摘要：把「还剩多少」这个真正要回答的问题写成人话，而不是让人自己心算 -->
      <div class="summary">
        <div class="summary-row">
          <span class="summary-key">剩余空间</span>
          <span class="summary-val">{{ remainSizeText }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">剩余图片数</span>
          <span class="summary-val">{{ remainCountText }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">配额状态</span>
          <span class="summary-val">
            <a-tag :color="quotaTagColor">{{ quotaText }}</a-tag>
          </span>
        </div>
        <div class="summary-note">统计含待审核与被拒绝图片，不含已删除</div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, ref, watchEffect } from 'vue'
import { getSpaceUsageAnalyze } from '@/api/spaceAnalyzeController'
import { formatSize } from '@/utils'
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

const data = ref<API.SpaceUsageAnalyzeResponse>({})
const loading = ref(true)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getSpaceUsageAnalyze({
      spaceId: props.spaceId,
      queryPublic: props.queryPublic,
      queryAll: props.queryAll,
    })
    if (res.data.code === 0 && res.data.data) {
      data.value = res.data.data
    } else {
      message.error('获取数据失败，' + res.data.message)
    }
  } finally {
    loading.value = false
  }
}

watchEffect(fetchData)

/** 公共图库与全空间没有配额概念，颜色保持中性 */
const hasQuota = computed(() => data.value.maxSize != null && data.value.maxCount != null)

const worstRatio = computed(() => {
  const size = data.value.sizeUsageRatio ?? 0
  const count = data.value.countUsageRatio ?? 0
  return Math.max(size, count)
})

const chartTheme = useChartTheme()

const ratioColor = computed(() => {
  if (!hasQuota.value) {
    return '#bfbfbf'
  }
  if (worstRatio.value >= 90) {
    return '#ff4d4f'
  }
  // 红/黄是语义告警色，保留；常态用量色跟品牌主色走
  return worstRatio.value >= 70 ? '#faad14' : chartTheme.value.seriesColor
})

const quotaText = computed(() => {
  if (!hasQuota.value) {
    return '无配额限制'
  }
  if (worstRatio.value >= 90) {
    return '接近上限'
  }
  return worstRatio.value >= 70 ? '用量偏高' : '用量充足'
})

const quotaTagColor = computed(() => (hasQuota.value ? ratioColor.value : 'default'))

const remainSizeText = computed(() => {
  const { usedSize = 0, maxSize } = data.value
  return maxSize == null ? '不限' : formatSize(Math.max(maxSize - usedSize, 0))
})

const remainCountText = computed(() => {
  const { usedCount = 0, maxCount } = data.value
  return maxCount == null ? '不限' : `${Math.max(maxCount - usedCount, 0)} 张`
})
</script>

<style scoped>
.usage-card {
  height: 100%;
}

.usage-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}

.gauges {
  flex: 0 0 auto;
}

.gauge {
  text-align: center;
  min-width: 148px;
}

.gauge-label {
  margin-top: 4px;
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.gauge-value {
  margin-top: 2px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.summary {
  flex: 1 1 240px;
  min-width: 240px;
  border-left: 1px solid var(--color-border-secondary);
  padding-left: 24px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 6px 0;
}

.summary-key {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.summary-val {
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.summary-note {
  margin-top: 8px;
  color: var(--color-text-placeholder);
  font-size: 12px;
}

@media (max-width: 768px) {
  .summary {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--color-border-secondary);
    padding-top: 12px;
  }
}
</style>
