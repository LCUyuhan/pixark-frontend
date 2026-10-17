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
      <div class="footer-inner">
        <div class="footer-brand" @click="router.push('/')">
          <img class="footer-wordmark on-light" src="/brand/logo-wordmark-dark.svg" alt="PixArk.cloud" />
          <img class="footer-wordmark on-dark" src="/brand/logo-wordmark-light.svg" alt="" aria-hidden="true" />
        </div>
        <p class="footer-tagline">Your Visual Universe · 用像素，承载无限的想象。</p>
        <p class="footer-copy">© 2026 PixArk.cloud. All rights reserved.</p>
      </div>
    </a-layout-footer>
    <MobileTabBar />
  </a-layout>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import MobileTabBar from '@/components/MobileTabBar.vue'

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
/* 只给真正会变色的三个面加过渡，不用全局 * { transition: all }：
   后者会让 hover、路由切换、图片淡入全都跟着延迟 */
.header,
.content,
.footer {
  transition:
    background-color 0.25s ease,
    color 0.25s ease;
}

.basic-layout {
  min-height: 100vh;
}

.header {
  padding: 0;
  height: var(--nav-height);
  line-height: normal;
  background: var(--color-bg-nav);
}

.content {
  padding: 24px;
  background: var(--color-bg-layout);
}

.footer {
  background: var(--color-bg-footer);
  border-top: 1px solid var(--color-border-secondary);
  padding: 32px 24px;
}

.footer-inner {
  max-width: var(--page-max-width);
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.footer-wordmark {
  height: 24px;
  width: auto;
  display: block;
}

/* 页脚在暗色主题下也是深色底，组合标志要换成浅色版 */
.on-dark {
  display: none;
}

/*
 * 这里不能用 :global()。scoped 转换器只把 [data-v-x] 加在最后一个复合选择器上，
 * 祖先 .dark-theme 本来就不会被加作用域，直接写后代即可。
 * 写成 :global(.dark-theme) .on-dark 时转换器会把后代整段丢掉，规则退化成裸的
 * .dark-theme —— 而这个类挂在 <html> 上，等于给根元素设 display:none，整页塌成 0×0。
 */
.dark-theme .on-dark {
  display: block;
}

.dark-theme .on-light {
  display: none;
}

.footer-tagline {
  margin: 10px 0 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.footer-copy {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 移动端：收窄页边距，底部给 Tab Bar 让位（含安全区） */
@media (max-width: 768px) {
  .content {
    padding: 16px 16px calc(88px + env(safe-area-inset-bottom));
  }

  .footer {
    padding: 24px 16px;
  }
}
</style>
