import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLoginUser } from '@/api/userController'

/** 未登录用户的默认值 */
const NOT_LOGIN_USER: API.LoginUserVO = {
  id: '',
  userAccount: '',
  userRole: 'notLogin',
}

/**
 * 登录用户状态
 * 基于后端 Session 认证，通过 /user/get/login 恢复登录态
 */
export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({ ...NOT_LOGIN_USER })

  /** 从后端拉取当前登录用户（页面刷新时恢复登录态） */
  async function fetchLoginUser() {
    try {
      const res = await getLoginUser()
      if (res.data.code === 0 && res.data.data) {
        loginUser.value = res.data.data
      }
    } catch {
      // 未登录或网络异常，保持未登录状态
      loginUser.value = { ...NOT_LOGIN_USER }
    }
  }

  /** 更新登录用户信息 */
  function setLoginUser(newLoginUser: API.LoginUserVO) {
    loginUser.value = newLoginUser
  }

  return { loginUser, fetchLoginUser, setLoginUser }
})
