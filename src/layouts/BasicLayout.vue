<template>
  <a-layout class="basic-layout">
    <a-layout-header class="header">
      <GlobalHeader />
    </a-layout-header>
    <a-layout-content class="content">
      <!-- key 绑定路由 path：同组件跨路由（如 创建/编辑图片）切换时强制重新挂载，避免旧状态残留 -->
      <router-view :key="route.path" />
    </a-layout-content>
    <a-layout-footer class="footer">
      智能协同云图库
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'

const route = useRoute()
</script>

<style scoped>
/* 只给真正会变色的三个面加过渡，不用全局 * { transition: all }：
   后者会让 hover、路由切换、图片淡入全都跟着延迟 */
.header,
.content,
.footer {
  transition:
    background-color 0.25s ease,
    box-shadow 0.25s ease,
    color 0.25s ease;
}

.basic-layout {
  min-height: 100vh;
}

.header {
  padding: 0;
  background: var(--color-bg-container);
  box-shadow: 0 2px 8px var(--color-shadow-header);
}

.content {
  padding: 24px;
  background: var(--color-bg-layout);
}

.footer {
  text-align: center;
  background: var(--color-bg-footer);
  padding: 16px;
  color: var(--color-text-tertiary);
}
</style>
