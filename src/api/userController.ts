import request from '@/request'

/**
 * 用户模块 API
 * 与后端 UserController 一一对应（接口前缀 /user）
 */

/** 用户注册 POST /user/register */
export async function userRegister(body: API.UserRegisterRequest) {
  return request.post<API.BaseResponse<number>>('/user/register', body)
}

/** 用户登录 POST /user/login */
export async function userLogin(body: API.UserLoginRequest) {
  return request.post<API.BaseResponse<API.LoginUserVO>>('/user/login', body)
}

/** 获取当前登录用户 GET /user/get/login */
export async function getLoginUser() {
  return request.get<API.BaseResponse<API.LoginUserVO>>('/user/get/login')
}

/** 用户注销 POST /user/logout */
export async function userLogout() {
  return request.post<API.BaseResponse<boolean>>('/user/logout')
}

/** 创建用户（仅管理员）POST /user/add */
export async function addUser(body: API.UserAddRequest) {
  return request.post<API.BaseResponse<number>>('/user/add', body)
}

/** 根据 id 获取用户（仅管理员）GET /user/get */
export async function getUserById(params: { id: number | string }) {
  return request.get<API.BaseResponse<API.UserVO>>('/user/get', { params })
}

/** 根据 id 获取脱敏用户信息 GET /user/get/vo */
export async function getUserVOById(params: { id: number | string }) {
  return request.get<API.BaseResponse<API.UserVO>>('/user/get/vo', { params })
}

/** 删除用户（仅管理员）POST /user/delete */
export async function deleteUser(body: API.DeleteRequest) {
  return request.post<API.BaseResponse<boolean>>('/user/delete', body)
}

/** 更新用户（仅管理员）POST /user/update */
export async function updateUser(body: API.UserUpdateRequest) {
  return request.post<API.BaseResponse<boolean>>('/user/update', body)
}

/** 分页获取用户列表（仅管理员）POST /user/list/page/vo */
export async function listUserVOByPage(body: API.UserQueryRequest) {
  return request.post<API.BaseResponse<API.Page<API.UserVO>>>('/user/list/page/vo', body)
}
