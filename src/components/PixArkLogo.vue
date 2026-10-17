<template>
  <!-- 品牌像素 P 图标：正式素材见 public/brand/。
       深/浅两版都渲染，靠 .dark-theme 全局类切换，深底浅底都保证可读 -->
  <span class="pixark-logo" :style="{ height: size + 'px' }">
    <img class="logo-img on-light" src="/brand/logo-icon-dark.svg" alt="PixArk" />
    <img class="logo-img on-dark" src="/brand/logo-icon-light.svg" alt="" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 21 })
</script>

<style scoped>
.pixark-logo {
  display: inline-block;
}

.logo-img {
  height: 100%;
  width: auto;
  display: block;
}

/* 亮色主题显示深色标，暗色主题换成浅色标 */
.on-dark {
  display: none;
}

/*
 * 不能用 :global()：转换器会丢掉后代，规则退化成裸 .dark-theme。
 * 该类挂在 <html> 上，等于给根元素设 display，整页会直接消失。
 * scoped 只给最后一个复合选择器加 [data-v-x]，祖先本来就不受作用域限制。
 */
.dark-theme .on-dark {
  display: block;
}

.dark-theme .on-light {
  display: none;
}
</style>
