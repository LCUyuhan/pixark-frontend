<template>
  <a-layout class="basic-layout">
    <a-layout-header class="header">
      <GlobalHeader />
    </a-layout-header>
    <a-layout-content class="content">
      <router-view />
    </a-layout-content>
    <a-layout-footer class="footer">
      智能协同云图库
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
import GlobalHeader from '@/components/GlobalHeader.vue'
</script>

<style scoped>
.basic-layout {
  min-height: 100vh;
}

.header {
  padding: 0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.content {
  padding: 24px;
  background: #f5f5f5;
}

.footer {
  text-align: center;
  background: #f0f2f5;
  padding: 16px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
