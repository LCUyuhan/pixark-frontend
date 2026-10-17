<template>
  <div class="user-register-page">
    <div class="brand-block">
      <PixArkLogo :size="26" class="brand-logo" />
      <h2 class="title">注册 PixArk<span class="title-light">.cloud</span></h2>
      <div class="desc">你的视觉宇宙，海量高清图片</div>
    </div>
    <a-form :model="formState" name="register" autocomplete="off" size="large" @finish="handleSubmit">
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>
      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 8, message: '密码不能小于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>
      <a-form-item
        name="checkPassword"
        :rules="[
          { required: true, message: '请再次输入密码' },
          { min: 8, message: '密码不能小于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>
      <div class="tips">
        已有账号？
        <RouterLink to="/user/login">去登录</RouterLink>
      </div>
      <a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading" style="width: 100%">
          注册
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PixArkLogo from '@/components/PixArkLogo.vue'
import { userRegister } from '@/api/userController'

const router = useRouter()

// 表单数据（对应后端 UserRegisterRequest）
const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const loading = ref(false)

/** 提交注册 */
const handleSubmit = async (values: API.UserRegisterRequest) => {
  // 前端先校验两次密码一致
  if (values.userPassword !== values.checkPassword) {
    message.error('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    const res = await userRegister(values)
    if (res.data.code === 0 && res.data.data) {
      message.success('注册成功，请登录')
      await router.push('/user/login')
    } else {
      message.error('注册失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('注册失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.user-register-page {
  max-width: 400px;
  margin: 48px auto;
  padding: 36px 32px;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
}

.brand-block {
  text-align: center;
  margin-bottom: 28px;
}

.brand-logo {
  color: var(--color-text);
}

.title {
  margin: 14px 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.title-light {
  font-weight: 400;
  color: var(--color-text-tertiary);
}

.desc {
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.tips {
  text-align: right;
  color: var(--color-text-tertiary);
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .user-register-page {
    margin: 24px auto;
    padding: 28px 20px;
  }
}
</style>
