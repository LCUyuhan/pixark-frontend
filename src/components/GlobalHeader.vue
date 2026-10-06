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
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { HomeOutlined, UserOutlined, LogoutOutlined, PlusOutlined, PictureOutlined, CloudUploadOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { userLogout } from '@/api/userController'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()
const loginUser = computed(() => loginUserStore.loginUser)

// 菜单项（管理类菜单仅管理员可见，与后端接口权限一致）
const originItems = [
  { key: '/', label: '主页', icon: () => h(HomeOutlined) },
  // 后端 /picture/upload 已对所有登录用户放开
  { key: '/add_picture', label: '创建图片', icon: () => h(PlusOutlined) },
  { key: '/admin/userManage', label: '用户管理', icon: () => h(UserOutlined), needAdmin: true },
  { key: '/admin/pictureManage', label: '图片管理', icon: () => h(PictureOutlined), needAdmin: true },
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

// 当前选中菜单（与路由同步）
const selectedKeys = ref<string[]>([route.path])
watch(
  () => route.path,
  (path) => {
    selectedKeys.value = [path]
  },
)

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
  color: #1677ff;
}

.menu {
  flex: 1;
  border-bottom: none;
}

.user-info {
  cursor: pointer;
}
</style>
