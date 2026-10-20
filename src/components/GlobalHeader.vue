<template>
  <div class="global-header">
    <div class="header-inner">
      <!-- 品牌区：桌面用完整组合标志（图标 + PixArk.cloud + tagline）；
           移动端用 compact 版（同一官方素材派生，仅去掉小到不可读的 tagline 行） -->
      <div class="brand" @click="router.push('/')">
        <img class="wordmark-img wordmark-full" src="/brand/logo-wordmark-light.svg" alt="PixArk.cloud" />
        <img class="wordmark-img wordmark-compact" src="/brand/logo-wordmark-light-compact.svg" alt="PixArk.cloud" />
      </div>

      <!-- 桌面端导航：常规项平铺，管理项收纳为下拉（管理员可见） -->
      <nav class="nav-desktop" aria-label="主导航">
        <a
          v-for="item in mainItems"
          :key="item.key"
          class="nav-link"
          :class="{ active: selectedKeys.includes(item.key) }"
          @click="doMenuClick(item.key)"
        >
          {{ item.label }}
        </a>
        <a-dropdown v-if="adminItems.length" trigger="click">
          <a class="nav-link admin-trigger" :class="{ active: isAdminRoute }">
            管理
            <DownOutlined class="admin-caret" />
          </a>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="item in adminItems" :key="item.key" @click="doMenuClick(item.key)">
                <component :is="item.icon" v-if="item.icon" />
                {{ item.label }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a class="nav-link" @click="openFeedback">反馈</a>
      </nav>

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

        <!-- 移动端：汉堡菜单 -->
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
        <a class="drawer-link" @click="openFeedback">
          <MessageOutlined />
          意见反馈
        </a>
      </div>
    </a-drawer>

    <a-modal v-model:open="feedbackOpen" title="意见反馈" :footer="null" width="420px" destroy-on-close>
      <p class="feedback-tip">使用中遇到问题、或有功能建议，欢迎邮件联系我。</p>
      <div class="feedback-email">{{ feedbackEmail }}</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { HomeOutlined, UserOutlined, LogoutOutlined, PlusOutlined, PictureOutlined, CloudUploadOutlined, FolderOutlined, DatabaseOutlined, AuditOutlined, BulbOutlined, BulbFilled, MenuOutlined, DownOutlined, MessageOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { userLogout } from '@/api/userController'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const themeStore = useThemeStore()
const loginUser = computed(() => loginUserStore.loginUser)

// 菜单项（管理类菜单仅管理员可见，与后端接口权限一致；「我的投稿」「我的空间」两类用户都可见）
const originItems = [
  { key: '/', label: '首页', icon: () => h(HomeOutlined) },
  // 后端 /picture/upload 已对所有登录用户放开
  { key: '/add_picture', label: '上传图片', icon: () => h(PlusOutlined) },
  { key: '/my_pictures', label: '我的投稿', icon: () => h(AuditOutlined) },
  { key: '/my_spaces', label: '我的空间', icon: () => h(FolderOutlined) },
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
    return true
  }),
)

// 桌面端分层：常规项平铺，管理项收进"管理"下拉。menuItems 已按权限过滤，
// 普通用户 adminItems 为空，下拉自然不渲染；抽屉菜单保持 menuItems 全量平铺
const mainItems = computed(() => menuItems.value.filter((item) => !item.needAdmin))
const adminItems = computed(() => menuItems.value.filter((item) => item.needAdmin))
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

// 当前选中菜单（与路由同步）
// 空间详情页是「我的空间」点进去的落地页（MySpacesPage 会 replace 到 /space/:id），
// 精确匹配 route.path 会让它谁都不亮，所以先映射回菜单 key
const menuKeyOf = (path: string) => (path.startsWith('/space/') ? '/my_spaces' : path)
const selectedKeys = computed(() => [menuKeyOf(route.path)])

const drawerOpen = ref(false)

/* ---- 意见反馈 ---- */
const feedbackOpen = ref(false)
const feedbackEmail = ref('')

// 邮箱在点击时才拼接，页面初始 HTML 里没有完整地址，静态爬虫抓不到
const openFeedback = () => {
  drawerOpen.value = false
  feedbackEmail.value = ['pixarkcloud', '163.com'].join('@')
  feedbackOpen.value = true
}

const doMenuClick = (key: string) => {
  drawerOpen.value = false
  router.push(key)
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
  width: auto;
  display: block;
}

/* 桌面端：完整组合标志。SVG viewBox 353.61×104 ≈ 3.4:1，36px 高 ≈ 122px 宽。
   导航栏恒为深色（#111318），白色字标单版本即可，无需随主题切换 */
.wordmark-full {
  height: 36px;
}

/* compact 版只在移动端出现（见下方媒体查询） */
.wordmark-compact {
  display: none;
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

/* "管理"下拉触发器：与平铺链接同款样式，active 高亮复用 .nav-link.active 的下划线 */
.admin-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.admin-caret {
  font-size: 10px;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin-left: auto;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-on-dark-secondary);
  line-height: 1;
}

.icon-btn:hover {
  color: var(--color-text-on-dark) !important;
  background: rgba(255, 255, 255, 0.12) !important;
}

.user-info {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  color: var(--color-text-on-dark);
  cursor: pointer;
  box-sizing: border-box;
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

/* ---- 反馈弹窗 ---- */
.feedback-tip {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.feedback-email {
  padding: 12px 14px;
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  background: var(--color-bg-layout);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  word-break: break-all;
  /* 点一下整段选中，省得手动拖 */
  user-select: all;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .header-inner {
    gap: 12px;
    padding: 0 16px;
  }

  .wordmark-full {
    /* 移动端隐藏含 tagline 的完整版（tagline 只占 viewBox 6%，30px 下糊成灰团） */
    display: none;
  }

  .wordmark-compact {
    /* compact viewBox 353.61×92 ≈ 3.84:1，32px 高 ≈ 123px 宽，
       PixArk.cloud 主字标比旧版大一档，右侧仍留得下灯泡/头像/汉堡 */
    display: block;
    height: 32px;
  }

  .nav-desktop,
  .user-name {
    display: none;
  }

  .mobile-only {
    display: inline-flex;
  }
}

/* 360px 以下窄屏（iPhone SE 一代等）：Logo 再收一档，避免与右侧按钮互相挤压 */
@media (max-width: 360px) {
  .wordmark-compact {
    height: 28px;
  }
}
</style>
