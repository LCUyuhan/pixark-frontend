<template>
  <a-config-provider :locale="zhCN">
    <div id="app">
      <BasicLayout />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import BasicLayout from '@/layouts/BasicLayout.vue'

dayjs.locale('zh-cn')
</script>

<style>
#app {
  height: 100vh;
}
</style>
