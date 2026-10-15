<template>
  <div class="space-analyze-page">
    <div class="page-head">
      <a-space :size="12" wrap>
        <a-button v-if="canGoBack" type="text" size="small" @click="goBack">
          <LeftOutlined />
          返回
        </a-button>
        <h2 class="page-title">
          空间图库分析
          <span class="page-sep">·</span>
          <a-tooltip v-if="scopeLabel.tooltip" :title="scopeLabel.tooltip">
            <span>{{ scopeLabel.text }}</span>
          </a-tooltip>
          <span v-else>{{ scopeLabel.text }}</span>
        </h2>
      </a-space>

      <!-- 范围切换只在管理员身上有意义：普通用户只有自己的空间，且后端会拒 queryAll/queryPublic -->
      <a-segmented
        v-if="isAdmin && scopeOptions.length > 1"
        :value="currentScope"
        :options="scopeOptions"
        @change="switchScope"
      />
    </div>

    <a-alert
      v-if="!hasScope"
      type="warning"
      show-icon
      message="未指定分析范围"
      description="请从「空间详情」页分析某个空间，或从「空间管理」页进入公共图库 / 全空间分析。"
      class="scope-alert"
    />

    <a-row v-else :gutter="[16, 16]">
      <a-col :span="24">
        <SpaceUsageAnalyze :space-id="spaceId" :query-public="queryPublic" :query-all="queryAll" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceCategoryAnalyze :space-id="spaceId" :query-public="queryPublic" :query-all="queryAll" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceTagAnalyze :space-id="spaceId" :query-public="queryPublic" :query-all="queryAll" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceSizeAnalyze :space-id="spaceId" :query-public="queryPublic" :query-all="queryAll" />
      </a-col>
      <a-col :xs="24" :md="12">
        <SpaceUserAnalyze :space-id="spaceId" :query-public="queryPublic" :query-all="queryAll" />
      </a-col>
      <a-col v-if="isAdmin" :span="24">
        <SpaceRankAnalyze />
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LeftOutlined } from '@ant-design/icons-vue'
import SpaceUsageAnalyze from '@/components/analyze/SpaceUsageAnalyze.vue'
import SpaceCategoryAnalyze from '@/components/analyze/SpaceCategoryAnalyze.vue'
import SpaceTagAnalyze from '@/components/analyze/SpaceTagAnalyze.vue'
import SpaceSizeAnalyze from '@/components/analyze/SpaceSizeAnalyze.vue'
import SpaceUserAnalyze from '@/components/analyze/SpaceUserAnalyze.vue'
import SpaceRankAnalyze from '@/components/analyze/SpaceRankAnalyze.vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

/**
 * URL 上的 queryAll=false 是字符串 "false"，用 !! 取反会得到 true，
 * 所以只认 1 / true 两种写法
 */
const flagOf = (value: unknown) => ['1', 'true'].includes(String(value).toLowerCase())

const spaceId = computed(() => (route.query.spaceId as string) || undefined)
const spaceName = computed(() => (route.query.name as string) || '')
const queryAll = computed(() => flagOf(route.query.queryAll))
const queryPublic = computed(() => flagOf(route.query.queryPublic))
const hasScope = computed(() => queryAll.value || queryPublic.value || !!spaceId.value)

const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')

const scopeLabel = computed(() => {
  if (queryAll.value) {
    return { text: '全部空间', tooltip: '' }
  }
  if (queryPublic.value) {
    return { text: '公共图库', tooltip: '' }
  }
  if (spaceId.value) {
    // 雪花 id 有 19 位，直接铺在标题上既难看又读不出信息，所以只显示尾号，完整 id 放 tooltip
    return {
      text: spaceName.value || `空间 #${spaceId.value.slice(-6)}`,
      tooltip: `空间 ID：${spaceId.value}`,
    }
  }
  return { text: '未指定范围', tooltip: '' }
})

type ScopeKey = 'all' | 'public' | 'space'

const currentScope = computed<ScopeKey>(() => {
  if (queryAll.value) {
    return 'all'
  }
  return queryPublic.value ? 'public' : 'space'
})

const scopeOptions = computed(() => {
  const options: { label: string; value: ScopeKey }[] = [
    { label: '全部空间', value: 'all' },
    { label: '公共图库', value: 'public' },
  ]
  if (spaceId.value) {
    options.push({ label: '当前空间', value: 'space' })
  }
  return options
})

/** 切换范围只改 query，图表组件依赖 props 自动重载；name 参数跟着空间走 */
const switchScope = (value: ScopeKey | string) => {
  const scope = value as ScopeKey
  const query: Record<string, string> = {}
  if (scope === 'all') {
    query.queryAll = '1'
  } else if (scope === 'public') {
    query.queryPublic = '1'
  } else {
    query.spaceId = spaceId.value ?? ''
    if (spaceName.value) {
      query.name = spaceName.value
    }
  }
  router.replace({ path: '/space_analyze', query })
}

const canGoBack = computed(() => !!window.history.state?.back)

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.space-analyze-page {
  max-width: 1320px;
  margin: 0 auto;
  padding-bottom: 24px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.page-sep {
  color: rgba(0, 0, 0, 0.25);
  margin: 0 4px;
}

.scope-alert {
  margin-bottom: 16px;
}
</style>
