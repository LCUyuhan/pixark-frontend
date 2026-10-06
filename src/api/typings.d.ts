/**
 * 全局类型定义
 * 与后端 yu-picture-backend 的响应包装类、DTO、VO 完全对应
 */

declare namespace API {
  /** 通用响应包装（对应后端 BaseResponse） */
  type BaseResponse<T> = {
    /** 状态码：0 成功，其余为错误码 */
    code: number
    /** 响应数据 */
    data: T
    /** 提示信息 */
    message: string
  }

  /** 删除请求（对应后端 DeleteRequest） */
  type DeleteRequest = {
    /** 删除的数据 id */
    id: number | string
  }

  /** 分页结果（对应后端 MyBatis-Plus Page） */
  type Page<T> = {
    /** 当前页数据 */
    records: T[]
    /** 总数 */
    total: number
    /** 每页条数 */
    size: number
    /** 当前页号 */
    current: number
  }

  // -------------------- 用户模块 --------------------

  /** 用户注册请求 */
  type UserRegisterRequest = {
    /** 账号 */
    userAccount: string
    /** 密码 */
    userPassword: string
    /** 确认密码 */
    checkPassword: string
  }

  /** 用户登录请求 */
  type UserLoginRequest = {
    /** 账号 */
    userAccount: string
    /** 密码 */
    userPassword: string
  }

  /** 用户添加请求（仅管理员） */
  type UserAddRequest = {
    /** 用户昵称 */
    userName?: string
    /** 账号 */
    userAccount?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin */
    userRole?: string
  }

  /** 用户更新请求（仅管理员） */
  type UserUpdateRequest = {
    /** id */
    id: number | string
    /** 用户昵称 */
    userName?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin */
    userRole?: string
  }

  /** 用户查询请求（仅管理员，含分页参数） */
  type UserQueryRequest = {
    /** 当前页号 */
    current?: number
    /** 页面大小 */
    pageSize?: number
    /** 排序字段 */
    sortField?: string
    /** 排序顺序（ascend/descend） */
    sortOrder?: string
    /** id */
    id?: number | string
    /** 用户昵称 */
    userName?: string
    /** 账号 */
    userAccount?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin/ban */
    userRole?: string
  }

  /** 登录用户视图（脱敏） */
  type LoginUserVO = {
    /** 用户 id */
    id: number | string
    /** 账号 */
    userAccount: string
    /** 用户昵称 */
    userName?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin */
    userRole: string
    /** 创建时间 */
    createTime?: string
    /** 更新时间 */
    updateTime?: string
  }

  /** 用户视图（脱敏） */
  type UserVO = {
    /** id */
    id: number | string
    /** 账号 */
    userAccount: string
    /** 用户昵称 */
    userName?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin */
    userRole?: string
    /** 创建时间 */
    createTime?: string
  }

  // -------------------- 图片模块 --------------------

  /** 图片上传请求（上传时可携带 id 表示重新上传） */
  type PictureUploadRequest = {
    /** 图片 id（用于修改） */
    id?: number | string
    /** 文件地址（通过 URL 上传时使用） */
    fileUrl?: string
    /** 图片名称 */
    picName?: string
  }

  /** 图片审核请求（仅管理员） */
  type PictureReviewRequest = {
    /** id */
    id: number | string
    /** 状态：0-待审核, 1-通过, 2-拒绝 */
    reviewStatus: number
    /** 审核信息 */
    reviewMessage?: string
  }

  /** 批量抓取上传请求（仅管理员） */
  type PictureUploadByBatchRequest = {
    /** 搜索词 */
    searchText?: string
    /** 抓取数量 */
    count?: number
    /** 名称前缀 */
    namePrefix?: string
  }

  /** 图片编辑请求（给用户使用） */
  type PictureEditRequest = {
    /** id */
    id: number | string
    /** 图片名称 */
    name?: string
    /** 简介 */
    introduction?: string
    /** 分类 */
    category?: string
    /** 标签 */
    tags?: string[]
  }

  /** 图片更新请求（仅管理员） */
  type PictureUpdateRequest = {
    /** id */
    id: number | string
    /** 图片名称 */
    name?: string
    /** 简介 */
    introduction?: string
    /** 分类 */
    category?: string
    /** 标签 */
    tags?: string[]
  }

  /** 图片查询请求（含分页参数） */
  type PictureQueryRequest = {
    /** 当前页号 */
    current?: number
    /** 页面大小 */
    pageSize?: number
    /** 排序字段 */
    sortField?: string
    /** 排序顺序（ascend/descend） */
    sortOrder?: string
    /** id */
    id?: number | string
    /** 图片名称 */
    name?: string
    /** 简介 */
    introduction?: string
    /** 分类 */
    category?: string
    /** 标签 */
    tags?: string[]
    /** 文件体积 */
    picSize?: number
    /** 图片宽度 */
    picWidth?: number
    /** 图片高度 */
    picHeight?: number
    /** 图片比例 */
    picScale?: number
    /** 图片格式 */
    picFormat?: string
    /** 搜索词（同时搜名称、简介等） */
    searchText?: string
    /** 用户 id */
    userId?: number | string
    /** 审核状态：0-待审核, 1-通过, 2-拒绝 */
    reviewStatus?: number
    /** 审核信息 */
    reviewMessage?: string
    /** 审核人 id */
    reviewerId?: number | string
  }

  /** 图片视图（脱敏） */
  type PictureVO = {
    /** id */
    id: number | string
    /** 图片 url */
    url?: string
    /** 缩略图 url */
    thumbnailUrl?: string
    /** 图片名称 */
    name?: string
    /** 简介 */
    introduction?: string
    /** 标签 */
    tags?: string[]
    /** 分类 */
    category?: string
    /** 文件体积 */
    picSize?: number
    /** 图片宽度 */
    picWidth?: number
    /** 图片高度 */
    picHeight?: number
    /** 图片比例 */
    picScale?: number
    /** 图片格式 */
    picFormat?: string
    /** 用户 id */
    userId?: number | string
    /** 审核状态：0-待审核, 1-通过, 2-拒绝 */
    reviewStatus?: number
    /** 审核信息 */
    reviewMessage?: string
    /** 审核人 id */
    reviewerId?: number | string
    /** 审核时间 */
    reviewTime?: string
    /** 创建时间 */
    createTime?: string
    /** 编辑时间 */
    editTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建用户信息 */
    user?: UserVO
  }

  /** 图片标签分类视图 */
  type PictureTagCategory = {
    /** 标签列表 */
    tagList: string[]
    /** 分类列表 */
    categoryList: string[]
  }
}
