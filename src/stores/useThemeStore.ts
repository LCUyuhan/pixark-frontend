import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { THEME_STORAGE_KEY } from '@/constants/theme'

/**
 * 主题（亮/暗）状态。
 * 纯 UI 偏好，存 localStorage 即可，不需要跨设备，所以不落库。
 */
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function applyToDocument() {
    document.documentElement.classList.toggle('dark-theme', isDark.value)
    // 供 color-scheme 类原生控件（滚动条、表单）跟随
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  function setDark(dark: boolean) {
    isDark.value = dark
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light')
    applyToDocument()
  }

  /**
   * 读取偏好并上色。必须在挂载前调用，否则首屏会先闪一下亮色。
   * 没存过偏好时跟随系统。
   */
  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    isDark.value = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    applyToDocument()
  }

  const toggleTheme = () => setDark(!isDark.value)

  return { isDark, setDark, toggleTheme, initTheme, themeName: computed(() => (isDark.value ? '暗色' : '亮色')) }
})
