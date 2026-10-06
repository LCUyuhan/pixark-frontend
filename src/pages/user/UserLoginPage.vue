<template>
  <div class="user-login-page">
    <h2 class="title">智能协同云图库 - 用户登录</h2>
    <div class="desc">企业级智能协同云图库</div>
    <a-form :model="formState" name="login" autocomplete="off" @finish="handleSubmit">
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
  max-width: 360px;
  margin: 32px auto;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
}

.title {
  text-align: center;
  margin-bottom: 8px;
}

.desc {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 24px;
}

.tips {
  text-align: right;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 16px;
}
</style>
