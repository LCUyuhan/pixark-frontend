<template>
  <div class="user-center-page">
    <a-card title="个人中心">
      <a-row :gutter="[24, 24]">
        <!-- 基本信息（只读） -->
        <a-col :xs="24" :md="10">
          <div class="avatar-area">
            <a-avatar :size="72" :src="loginUser.userAvatar">
              {{ loginUser.userName?.[0] ?? loginUser.userAccount?.[0] }}
            </a-avatar>
          </div>
          <a-descriptions :column="1" size="small" bordered style="margin-top: 16px">
            <a-descriptions-item label="账号">{{ loginUser.userAccount }}</a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag :color="loginUser.userRole === 'admin' ? 'gold' : 'blue'">
                {{ loginUser.userRole === 'admin' ? '管理员' : '普通用户' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="注册时间">
              {{ loginUser.createTime ? dayjs(loginUser.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-col>

        <!-- 编辑表单 -->
        <a-col :xs="24" :md="14">
          <a-form :model="editForm" layout="vertical" @finish="handleSubmit">
            <a-form-item label="昵称">
              <a-input v-model:value="editForm.userName" placeholder="请输入昵称" :maxlength="30" />
            </a-form-item>
            <a-form-item label="头像 URL">
              <a-input v-model:value="editForm.userAvatar" placeholder="请输入头像图片地址" />
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
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { editUser } from '@/api/userController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const loginUserStore = useLoginUserStore()
const loginUser = computed(() => loginUserStore.loginUser)

const saving = ref(false)

const editForm = reactive<API.UserEditRequest>({
  userName: '',
  userAvatar: '',
  userProfile: '',
})

/** 用当前登录信息回填表单 */
const fillForm = () => {
  editForm.userName = loginUser.value.userName ?? ''
  editForm.userAvatar = loginUser.value.userAvatar ?? ''
  editForm.userProfile = loginUser.value.userProfile ?? ''
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const res = await editUser({ ...editForm })
    if (res.data.code === 0) {
      message.success('保存成功')
      // 同步刷新头部展示的登录态
      loginUserStore.setLoginUser({
        ...loginUser.value,
        userName: editForm.userName,
        userAvatar: editForm.userAvatar,
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
</script>

<style scoped>
.user-center-page {
  max-width: 860px;
  margin: 0 auto;
}

.avatar-area {
  text-align: center;
}
</style>
