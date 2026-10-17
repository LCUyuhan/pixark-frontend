<template>
  <!-- 移动端底部导航：首页 / 搜索 / 上传 / 空间 / 我的。
       仅 <768px 显示（CSS 控制），桌面端继续用顶部导航。 -->
  <nav class="mobile-tab-bar" aria-label="底部导航">
    <a
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ active: isActive(tab) }"
      :aria-label="tab.label"
      @click="go(tab)"
    >
      <component :is="tab.icon" class="tab-icon" />
      <span class="tab-label">{{ tab.label }}</span>
    </a>
  </nav>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeOutlined, SearchOutlined, PlusOutlined, FolderOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const loginUser = computed(() => loginUserStore.loginUser)

interface Tab {
  key: string
  label: string
  icon: ReturnType<typeof h>
}

const tabs: Tab[] = [
  { key: 'home', label: '首页', icon: h(HomeOutlined) },
  { key: 'search', label: '搜索', icon: h(SearchOutlined) },
  { key: 'upload', label: '上传', icon: h(PlusOutlined) },
  { key: 'space', label: '空间', icon: h(FolderOutlined) },
  { key: 'me', label: '我的', icon: h(UserOutlined) },
]

/**
 * 各 Tab 的落地路由，全部复用现有路由与权限逻辑：
 * - 上传：/add_picture 自带 loginRequired，未登录会被路由守卫送去登录页
 * - 空间：两类用户都进「我的空间」；管理员另有「空间管理」，从桌面端管理下拉进入
 * - 我的：未登录进登录页
 */
const targetOf = (tab: Tab): string => {
  switch (tab.key) {
    case 'home':
      return '/'
    case 'upload':
      return '/add_picture'
    case 'space':
      return '/my_spaces'
    case 'me':
      return loginUser.value.id ? '/user/center' : '/user/login'
    default:
      return '/'
  }
}

const isActive = (tab: Tab): boolean => {
  const path = route.path
  switch (tab.key) {
    case 'home':
      return path === '/'
    case 'upload':
      return path === '/add_picture' || path.startsWith('/picture/edit')
    case 'space':
      return path === '/my_spaces' || path.startsWith('/space/') || path.startsWith('/admin/space')
    case 'me':
      return path === '/user/center' || path === '/user/login'
    default:
    // 搜索是动作型 Tab，没有落地页，不高亮
      return false
  }
}

const go = (tab: Tab) => {
  if (tab.key === 'search') {
    // 回首页并聚焦 Hero 搜索框（首页监听 focus query）
    router.push({ path: '/', query: { ...route.query, focus: 'search' } })
    return
  }
  router.push(targetOf(tab))
}
</script>

<style scoped>
.mobile-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .mobile-tab-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    display: flex;
    /* 底部安全区：iPhone 全面屏的 Home 指示条 */
    height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--color-bg-container);
    border-top: 1px solid var(--color-border-secondary);
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .tab-icon {
    font-size: 20px;
  }

  .tab-label {
    font-size: 11px;
    line-height: 1;
  }

  .tab.active {
    color: var(--color-text);
    font-weight: 500;
  }
}
</style>
