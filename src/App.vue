<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <div id="app">
      <!-- key 绑定主题：ant-design-vue 4.x 的组件样式在 setup() 里一次性注册进 cssinjs，
           已挂载的组件不会随 ConfigProvider 的 algorithm 变化重新取样式，
           只有重新挂载才会用新主题注册。切换主题会重跑各页 onMounted，属于可接受的代价。 -->
      <BasicLayout :key="themeStore.isDark ? 'dark' : 'light'" />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { THEME_SEED, THEME_SEED_DARK } from '@/constants/theme'
import { useThemeStore } from '@/stores/useThemeStore'

dayjs.locale('zh-cn')

const themeStore = useThemeStore()

// 主色随主题翻转：亮色近黑、暗色浅灰（色板本身是黑白灰，算法只负责派生梯度）
const themeConfig = computed(() => ({
  token: themeStore.isDark ? { ...THEME_SEED_DARK } : { ...THEME_SEED },
  algorithm: themeStore.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
}))
</script>

<style>
#app {
  height: 100vh;
}
</style>
