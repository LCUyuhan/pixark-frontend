import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import '@/styles/tokens.css'
import '@/styles/dark.css'

import App from './App.vue'
import router from './router'
import '@/access'
import { useThemeStore } from '@/stores/useThemeStore'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

// 挂载前上色，避免暗色偏好用户每次进页面先闪一下亮色
useThemeStore().initTheme()

app.mount('#app')
