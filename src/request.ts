import axios from 'axios'
import { message } from 'ant-design-vue'

// 后端服务地址（端口 8123，上下文路径 /api）
const BASE_URL = 'http://localhost:8123/api'

// 创建 Axios 实例
const request = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  // 后端基于 Session 认证，必须携带 Cookie
  withCredentials: true,
})

// 响应拦截器：统一处理后端 BaseResponse 包装
request.interceptors.response.use(
  (response) => {
    const { data } = response
    // 未登录：跳转登录页
    if (data.code === 40100) {
      // 非登录请求且不在登录页时跳转
      if (
        !response.request.responseURL.includes('user/get/login') &&
        !window.location.pathname.includes('/user/login')
      ) {
        message.warning('请先登录')
        window.location.href = `/user/login?redirect=${window.location.pathname}`
      }
      return Promise.reject(data)
    }
    // 其他业务错误
    if (data.code !== 0) {
      return Promise.reject(data)
    }
    // 成功：返回完整响应，由调用方取 data
    return response
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default request
