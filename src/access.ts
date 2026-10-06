import router from '@/router'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { message } from 'ant-design-vue'

// 是否为首次获取登录用户（避免每次跳转都请求后端）
let firstFetchLoginUser = true

/**
 * 全局权限校验
 * 后端基于 @AuthCheck 注解做权限控制，前端路由同步拦截，仅做展示层过滤
 */
router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()
  // 首次跳转时，先向后端拉取登录态
  if (firstFetchLoginUser) {
    await loginUserStore.fetchLoginUser()
    firstFetchLoginUser = false
  }

  const loginUser = loginUserStore.loginUser
  const needAccess = (to.meta?.access as string) ?? null

  // 需要管理员权限的页面
  if (needAccess === 'admin') {
    // 未登录：跳转登录页
    if (!loginUser.id || loginUser.userRole === 'notLogin') {
      message.warning('请先登录')
      next(`/user/login?redirect=${to.fullPath}`)
      return
    }
    // 已登录但非管理员：跳转无权限页
    if (loginUser.userRole !== 'admin') {
      next('/noAuth')
      return
    }
  }
  next()
})
