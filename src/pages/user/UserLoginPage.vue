<template>
  <div class="user-login-page">
    <div class="brand-block">
      <PixArkLogo :size="26" class="brand-logo" />
      <h2 class="title">登录 PixArk<span class="title-light">.cloud</span></h2>
      <div class="desc">你的视觉宇宙，海量高清图片</div>
    </div>
    <a-form :model="formState" name="login" autocomplete="off" size="large" @finish="handleSubmit">
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
      <div class="tips">
        没有账号？
        <RouterLink to="/user/register">去注册</RouterLink>
      </div>
      <a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading" style="width: 100%">
          登录
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PixArkLogo from '@/components/PixArkLogo.vue'
import { userLogin } from '@/api/userController'
import { useLoginUserStore } from '@/stores/useLoginUserStore'

const router = useRouter()
const route = useRoute()
const loginUserStore = useLoginUserStore()

// 表单数据（对应后端 UserLoginRequest）
const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

const loading = ref(false)

/** 提交登录 */
const handleSubmit = async (values: API.UserLoginRequest) => {
  loading.value = true
  try {
    const res = await userLogin(values)
    if (res.data.code === 0 && res.data.data) {
      // 保存登录态并跳转
      loginUserStore.setLoginUser(res.data.data)
      message.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      await router.push(redirect)
    } else {
      message.error('登录失败：' + res.data.message)
    }
  } catch (e: any) {
    message.error('登录失败：' + (e?.message ?? '网络错误'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.user-login-page {
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
  .user-login-page {
    margin: 24px auto;
    padding: 28px 20px;
  }
}
</style>
