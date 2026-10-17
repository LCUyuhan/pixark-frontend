<template>
  <div class="global-header">
    <div class="header-inner">
      <!-- 品牌区：正式组合标志（图标 + 转曲文字标） -->
      <div class="brand" @click="router.push('/')">
        <img class="wordmark-img" src="/brand/logo-wordmark-light.svg" alt="PixArk.cloud" />
      </div>

      <!-- 桌面端导航 -->
      <nav class="nav-desktop" aria-label="主导航">
        <a
          v-for="item in menuItems"
          :key="item.key"
          class="nav-link"
          :class="{ active: selectedKeys.includes(item.key) }"
          @click="doMenuClick(item.key)"
        >
          {{ item.label }}
        </a>
      </nav>

      <!-- 桌面端内嵌搜索：写入地址栏 query，首页监听后执行真实搜索 -->
      <div class="search-desktop">
        <a-input-search
          v-model:value="navSearchText"
          placeholder="搜索图片、标签、用户…"
          @search="doNavSearch"
        />
      </div>

      <div class="right">
        <a-tooltip :title="themeStore.isDark ? '切换到亮色' : '切换到暗色'">
          <a-button type="text" class="icon-btn" aria-label="切换明暗主题" @click="themeStore.toggleTheme()">
            <template #icon>
              <BulbFilled v-if="themeStore.isDark" />
              <BulbOutlined v-else />
            </template>
          </a-button>
        </a-tooltip>
        <!-- 已登录：显示用户名下拉菜单 -->
        <a-dropdown v-if="loginUser.id">
          <a-space class="user-info">
            <a-avatar :src="loginUser.userAvatar">
              {{ loginUser.userName?.[0] ?? loginUser.userAccount?.[0] }}
            </a-avatar>
            <span class="user-name">{{ loginUser.userName ?? '无名' }}</span>
          </a-space>
          <template #overlay>
            <a-menu>
              <a-menu-item key="center" @click="router.push('/user/center')">
                <UserOutlined />
                个人中心
              </a-menu-item>
              <a-menu-item key="logout" @click="doLogout">
                <LogoutOutlined />
                退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <!-- 未登录：白底深色字按钮，在深色导航上保持可辨认 -->
        <a-button v-else class="login-btn" @click="router.push('/user/login')">登录</a-button>

        <!-- 移动端：搜索入口 + 汉堡菜单 -->
        <a-button type="text" class="icon-btn mobile-only" aria-label="搜索" @click="goSearch">
          <template #icon><SearchOutlined /></template>
        </a-button>
        <a-button type="text" class="icon-btn mobile-only" aria-label="打开菜单" @click="drawerOpen = true">
          <template #icon><MenuOutlined /></template>
        </a-button>
      </div>
    </div>

    <!-- 移动端抽屉菜单：与桌面导航同一套权限过滤后的菜单项 -->
    <a-drawer v-model:open="drawerOpen" placement="right" :width="264" title="菜单">
      <div class="drawer-nav">
        <a
          v-for="item in menuItems"
          :key="item.key"
          class="drawer-link"
          :class="{ active: selectedKeys.includes(item.key) }"
          @click="doMenuClick(item.key)"
        >
          <component :is="item.icon" v-if="item.icon" />
          {{ item.label }}
        </a>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { HomeOutlined, UserOutlined, LogoutOutlined, PlusOutlined, PictureOutlined, CloudUploadOutlined, FolderOutlined, DatabaseOutlined, AuditOutlined, BulbOutlined, BulbFilled, SearchOutlined, MenuOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { userLogout } from '@/api/userController'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const themeStore = useThemeStore()
const loginUser = computed(() => loginUserStore.loginUser)

// 菜单项（管理类菜单仅管理员可见，与后端接口权限一致；我的空间仅普通用户可见）
const originItems = [
  { key: '/', label: '首页', icon: () => h(HomeOutlined) },
  // 后端 /picture/upload 已对所有登录用户放开
  { key: '/add_picture', label: '上传图片', icon: () => h(PlusOutlined) },
  { key: '/my_pictures', label: '我的投稿', icon: () => h(AuditOutlined), hideForAdmin: true },
  { key: '/my_spaces', label: '我的空间', icon: () => h(FolderOutlined), hideForAdmin: true },
  { key: '/admin/userManage', label: '用户管理', icon: () => h(UserOutlined), needAdmin: true },
  { key: '/admin/pictureManage', label: '图片管理', icon: () => h(PictureOutlined), needAdmin: true },
  { key: '/admin/spaceManage', label: '空间管理', icon: () => h(DatabaseOutlined), needAdmin: true },
  // 后端 /picture/upload/batch 仅管理员可用
  { key: '/admin/addPictureBatch', label: '批量创建图片', icon: () => h(CloudUploadOutlined), needAdmin: true },
]

// 根据当前登录用户过滤菜单
const menuItems = computed(() =>
  originItems.filter((item) => {
    if (item.needAdmin) {
      return loginUser.value.userRole === 'admin'
    }
    if (item.hideForAdmin) {
      return loginUser.value.userRole !== 'admin'
    }
    return true
  }),
)

// 当前选中菜单（与路由同步）
// 空间详情页是「我的空间」点进去的落地页（MySpacesPage 会 replace 到 /space/:id），
// 精确匹配 route.path 会让它谁都不亮，所以先映射回菜单 key
const menuKeyOf = (path: string) => (path.startsWith('/space/') ? '/my_spaces' : path)
const selectedKeys = computed(() => [menuKeyOf(route.path)])

const drawerOpen = ref(false)

const doMenuClick = (key: string) => {
  drawerOpen.value = false
  router.push(key)
}

// ---- 导航栏搜索 ----
const navSearchText = ref('')

/** 写入地址栏 query 并回首页；首页监听 query 变化后执行搜索（数据流只有一条） */
const doNavSearch = () => {
  const text = navSearchText.value.trim()
  router.push({ path: '/', query: text ? { searchText: text } : {} })
}

/** 移动端搜索图标：回首页并让首页聚焦 Hero 搜索框 */
const goSearch = () => {
  router.push({ path: '/', query: { ...route.query, focus: 'search' } })
}

/** 退出登录 */
const doLogout = async () => {
  const res = await userLogout()
  if (res.data.code === 0) {
    loginUserStore.setLoginUser({ id: '', userAccount: '', userRole: 'notLogin' })
    message.success('退出登录成功')
    await router.push('/user/login')
  } else {
    message.error('退出登录失败：' + res.data.message)
  }
}
</script>

<style scoped>
/* 深色导航在亮/暗两种主题下都保持深色（品牌规范），所以颜色全部用 on-dark 令牌，不随主题翻 */
.global-header {
  height: var(--nav-height);
  background: var(--color-bg-nav);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  height: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 24px;
}

.brand {
  display: flex;
  align-items: center;
  flex: none;
  cursor: pointer;
}

.wordmark-img {
  height: 26px;
  width: auto;
  display: block;
}

/* ---- 桌面导航链接 ---- */
.nav-desktop {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-desktop::-webkit-scrollbar {
  display: none;
}

.nav-link {
  position: relative;
  flex: none;
  padding: 6px 12px;
  font-size: 14px;
  color: var(--color-text-on-dark-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--color-text-on-dark);
}

.nav-link.active {
  color: var(--color-text-on-dark);
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -2px;
  height: 2px;
  border-radius: 1px;
  background: #ffffff;
}

/* ---- 桌面内嵌搜索 ---- */
.search-desktop {
  flex: 1;
  max-width: 320px;
  margin-left: auto;
}

.search-desktop :deep(.ant-input) {
  background: rgba(255, 255, 255, 0.12);
  border-color: transparent;
  color: var(--color-text-on-dark);
}

.search-desktop :deep(.ant-input::placeholder) {
  color: var(--color-text-on-dark-secondary);
}

.search-desktop :deep(.ant-input:hover),
.search-desktop :deep(.ant-input:focus) {
  background: rgba(255, 255, 255, 0.18);
  border-color: transparent;
  box-shadow: none;
}

.search-desktop :deep(.ant-input-search-button) {
  background: rgba(255, 255, 255, 0.12);
  border-color: transparent;
  color: var(--color-text-on-dark);
}

.search-desktop :deep(.ant-input-search-button:hover) {
  background: rgba(255, 255, 255, 0.24);
  border-color: transparent;
}

.right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.icon-btn {
  color: var(--color-text-on-dark-secondary);
}

.icon-btn:hover {
  color: var(--color-text-on-dark) !important;
  background: rgba(255, 255, 255, 0.12) !important;
}

.user-info {
  cursor: pointer;
  color: var(--color-text-on-dark);
  padding: 4px 6px;
  border-radius: var(--radius-sm);
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.12);
}

.login-btn {
  background: #ffffff;
  border: none;
  color: #17191d;
  font-weight: 500;
}

.login-btn:hover,
.login-btn:focus {
  background: rgba(255, 255, 255, 0.85) !important;
  color: #17191d !important;
}

/* ---- 移动端抽屉菜单 ---- */
.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  color: var(--color-text);
  cursor: pointer;
}

.drawer-link:hover {
  background: var(--color-bg-layout);
}

.drawer-link.active {
  font-weight: 600;
  background: var(--color-primary-bg);
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .header-inner {
    gap: 12px;
    padding: 0 16px;
  }

  .nav-desktop,
  .search-desktop,
  .user-name {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }
}
</style>
