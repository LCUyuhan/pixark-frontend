<template>
  <div class="user-center-page">
    <header class="page-header">
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">管理你的头像、昵称和简介</p>
    </header>

    <div class="center-layout">
      <!-- 基本信息（只读）：浅灰底衬面板，与图片详情页同一语言 -->
      <section class="profile-panel">
        <div class="avatar-area">
          <a-avatar :size="88" :src="previewAvatar">
            {{ loginUser.userName?.[0] ?? loginUser.userAccount?.[0] }}
          </a-avatar>
          <div class="avatar-actions">
            <a-upload
              :show-upload-list="false"
              :before-upload="beforeAvatarUpload"
              accept="image/*"
            >
              <a-button type="primary" size="small">选择头像</a-button>
            </a-upload>
            <a-button v-if="pendingAvatarFile" type="link" size="small" @click="clearPendingAvatar">
              撤销
            </a-button>
            <a-button type="link" size="small" @click="showExternalInput = !showExternalInput">
              {{ showExternalInput ? '收起外链' : '使用外链' }}
            </a-button>
          </div>
          <a-input
            v-if="showExternalInput"
            v-model:value="editForm.userAvatar"
            placeholder="粘贴图片外链地址"
            size="small"
            style="margin-top: 8px"
          />
          <div class="avatar-tip">
            {{ pendingAvatarFile ? '已选择本地图片，点击"保存修改"时才上传' : '新头像需点击"保存修改"后生效' }}
          </div>
        </div>

        <dl class="meta-list">
          <div class="meta-row">
            <dt>账号</dt>
            <dd>{{ loginUser.userAccount }}</dd>
          </div>
          <div class="meta-row">
            <dt>角色</dt>
            <dd>
              <a-tag :color="loginUser.userRole === 'admin' ? 'gold' : 'default'">
                {{ loginUser.userRole === 'admin' ? '管理员' : '普通用户' }}
              </a-tag>
            </dd>
          </div>
          <div class="meta-row">
            <dt>注册时间</dt>
            <dd>{{ loginUser.createTime ? dayjs(loginUser.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}</dd>
          </div>
        </dl>
      </section>

      <!-- 编辑表单 -->
      <section class="edit-panel">
        <h2 class="panel-title">编辑资料</h2>
        <a-form :model="editForm" layout="vertical" @finish="handleSubmit">
          <a-form-item label="昵称">
            <a-input v-model:value="editForm.userName" placeholder="请输入昵称" :maxlength="30" />
          </a-form-item>
          <a-form-item label="简介">
            <a-textarea
              v-model:value="editForm.userProfile"
              placeholder="请输入个人简介"
              :maxlength="512"
              :auto-size="{ minRows: 3, maxRows: 6 }"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="saving">保存修改</a-button>
          </a-form-item>
        </a-form>
      </section>
    </div>

    <!-- 头像裁剪弹窗 -->
    <AvatarCropperModal v-model:open="cropperOpen" :src="cropperSrc" @crop="handleCropped" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { editUser, uploadAvatar } from '@/api/userController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import AvatarCropperModal from '@/components/AvatarCropperModal.vue'

const loginUserStore = useLoginUserStore()
const loginUser = computed(() => loginUserStore.loginUser)

const saving = ref(false)

const editForm = reactive<API.UserEditRequest>({
  userName: '',
  userAvatar: '',
  userProfile: '',
})

/** 待上传的本地头像（保存时才真正上传，放弃即无痕，不在 COS 留孤儿文件） */
const pendingAvatarFile = ref<File | null>(null)
const pendingAvatarUrl = ref('')

/** 头像实时预览：优先展示待保存的本地图片 */
const previewAvatar = computed(
  () => pendingAvatarUrl.value || editForm.userAvatar || loginUser.value.userAvatar,
)

const showExternalInput = ref(false)

// ===== 头像裁剪：选图 → 裁剪 → 裁后文件作为待上传，保存时才写 COS =====
const cropperOpen = ref(false)
const cropperSrc = ref('')

const clearCropperSrc = () => {
  if (cropperSrc.value) {
    URL.revokeObjectURL(cropperSrc.value)
    cropperSrc.value = ''
  }
}

const clearPendingAvatar = () => {
  if (pendingAvatarUrl.value) {
    URL.revokeObjectURL(pendingAvatarUrl.value)
  }
  pendingAvatarFile.value = null
  pendingAvatarUrl.value = ''
}

/** 选图时只做校验并打开裁剪弹窗，返回 false 阻止组件自动上传 */
const beforeAvatarUpload = (file: File) => {
  if (!file.type.startsWith('image/')) {
    message.error('仅支持上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 > 10) {
    message.error('原图大小不能超过 10MB')
    return false
  }
  clearCropperSrc()
  cropperSrc.value = URL.createObjectURL(file)
  cropperOpen.value = true
  return false
}

/** 裁剪完成：256×256 jpg 作为待上传文件 */
const handleCropped = (blob: Blob) => {
  clearCropperSrc()
  clearPendingAvatar()
  pendingAvatarFile.value = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
  pendingAvatarUrl.value = URL.createObjectURL(blob)
}

/** 用当前登录信息回填表单 */
const fillForm = () => {
  editForm.userName = loginUser.value.userName ?? ''
  editForm.userAvatar = loginUser.value.userAvatar ?? ''
  editForm.userProfile = loginUser.value.userProfile ?? ''
}

const handleSubmit = async () => {
  saving.value = true
  try {
    // 有待上传的本地图片：先传 COS 拿到 URL，再随表单一起保存
    let avatarUrl = editForm.userAvatar
    if (pendingAvatarFile.value) {
      const uploadRes = await uploadAvatar(pendingAvatarFile.value)
      if (uploadRes.data.code !== 0 || !uploadRes.data.data) {
        message.error('头像上传失败：' + uploadRes.data.message)
        return
      }
      avatarUrl = uploadRes.data.data
    }
    const res = await editUser({ ...editForm, userAvatar: avatarUrl })
    if (res.data.code === 0) {
      message.success('保存成功')
      editForm.userAvatar = avatarUrl
      clearPendingAvatar()
      // 同步刷新头部展示的登录态
      loginUserStore.setLoginUser({
        ...loginUser.value,
        userName: editForm.userName,
        userAvatar: avatarUrl,
        userProfile: editForm.userProfile,
      })
    } else {
      message.error('保存失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('保存失败：' + (e?.message ?? '网络错误'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fillForm()
})

onBeforeUnmount(() => {
  clearPendingAvatar()
  clearCropperSrc()
})
</script>

<style scoped>
.user-center-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.center-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 32px;
  align-items: start;
}

/* 浅灰底衬面板，与图片详情页的 image-panel 同一语言 */
.profile-panel {
  padding: 28px 24px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-subtle);
}

.avatar-area {
  text-align: center;
}

.avatar-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
}

.avatar-tip {
  margin-top: 4px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

/* 账号信息：标签小字 + 值，行间细分隔线，不用带边框的描述列表 */
.meta-list {
  margin: 24px 0 0;
  padding: 4px 0 0;
  border-top: 1px solid var(--color-border);
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-secondary);
}

.meta-row dt {
  flex: none;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.meta-row dd {
  margin: 0;
  font-size: 13px;
  color: var(--color-text);
  word-break: break-all;
  text-align: right;
}

.panel-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

/* 移动端：单列，资料面板在上 */
@media (max-width: 768px) {
  .center-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .page-header {
    margin-bottom: 18px;
  }
}
</style>
