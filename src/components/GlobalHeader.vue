<template>
  <div class="global-header">
    <div class="left" @click="router.push('/')">
      <span class="title">智能协同云图库</span>
    </div>

    <a-menu
      class="menu"
      mode="horizontal"
      :selected-keys="selectedKeys"
      :items="menuItems"
      @click="doMenuClick"
    />

    <div class="right">
      <a-tooltip :title="themeStore.isDark ? '切换到亮色' : '切换到暗色'">
        <a-button type="text" aria-label="切换明暗主题" @click="themeStore.toggleTheme()">
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
          {{ loginUser.userName ?? '无名' }}
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
      <!-- 未登录：显示登录按钮 -->
      <a-button v-else type="primary" @click="router.push('/user/login')">登录</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { HomeOutlined, UserOutlined, LogoutOutlined, PlusOutlined, PictureOutlined, CloudUploadOutlined, FolderOutlined, DatabaseOutlined, AuditOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons-vue'
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
  { key: '/', label: '主页', icon: () => h(HomeOutlined) },
  // 后端 /picture/upload 已对所有登录用户放开
  { key: '/add_picture', label: '创建图片', icon: () => h(PlusOutlined) },
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

const doMenuClick = ({ key }: { key: string }) => {
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
.global-header {
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.left {
  cursor: pointer;
  margin-right: 32px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary);
}

.menu {
  flex: 1;
  min-width: 0;
  border-bottom: none;
}

/* ---- 选中态改成浅色胶囊，去掉下划线 ----
   ADV 4.2.6 的下划线是 .ant-menu-item::after 的 border-bottom，
   而且 hover / active / open / selected 共用同一条（menu/style/theme.js:138-152），
   所以先把伪元素整个关掉，再用背景色区分状态。
   注意：.ant-menu-horizontal 和 .menu 是同一个 ul 元素，不能写进 :deep() 里当后代选择器 */
.menu :deep(.ant-menu-item::after),
.menu :deep(.ant-menu-submenu::after) {
  display: none !important;
}

.menu :deep(.ant-menu-item),
.menu :deep(.ant-menu-submenu) {
  top: 0;
  margin: 12px 2px;
  height: 40px;
  line-height: 40px;
  vertical-align: top;
  padding-inline: 14px;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

/* 选中：底色 + 文字色 + 字重三个通道，不只靠颜色 */
.menu :deep(.ant-menu-item-selected) {
  color: var(--color-primary);
  font-weight: 600;
  background-color: var(--color-primary-bg);
}

/* hover：浅灰底，和选中的蓝底明显区分 */
.menu :deep(.ant-menu-item:not(.ant-menu-item-selected):hover),
.menu :deep(.ant-menu-item-active:not(.ant-menu-item-selected)) {
  color: var(--color-text);
  background-color: var(--color-bg-layout);
}

/* 键盘导航要能看出焦点在哪 */
.menu :deep(.ant-menu-item:focus-visible) {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  cursor: pointer;
}
</style>
