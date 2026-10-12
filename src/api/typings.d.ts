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
    /** AI 图片编辑剩余额度（次数），留空则不修改 */
    aiQuota?: number
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

  /** 用户实体（后端原始实体，仅管理员接口返回，含密码哈希，切勿直接渲染） */
  type User = {
    /** 用户 id */
    id: number | string
    /** 账号 */
    userAccount?: string
    /** 密码哈希（敏感，仅限管理端） */
    userPassword?: string
    /** 用户昵称 */
    userName?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
    /** 用户角色：user/admin/ban */
    userRole?: string
    /** 创建时间 */
    createTime?: string
    /** 编辑时间 */
    editTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 是否删除：0-未删除 */
    isDelete?: number
  }

  /** 用户编辑请求（登录用户改自己的信息，不含账号/密码/角色） */
  type UserEditRequest = {
    /** 用户昵称 */
    userName?: string
    /** 用户头像 */
    userAvatar?: string
    /** 用户简介 */
    userProfile?: string
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
    /** AI 图片编辑剩余额度（次数），管理员可发放 */
    aiQuota?: number
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
    /** 目标空间 id，不传则为公共图库 */
    spaceId?: number | string
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
    /** 空间 id */
    spaceId?: number | string
    /** 是否只查 spaceId 为 null 的公共图库数据 */
    nullSpaceId?: boolean
    /** 开始编辑时间 */
    startEditTime?: string
    /** 结束编辑时间 */
    endEditTime?: string
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
    /** 图片主色调（十六进制，如 0xFF0000） */
    picColor?: string
    /** 用户 id */
    userId?: number | string
    /** 空间 id */
    spaceId?: number | string
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

  /** 图片实体（后端原始实体，仅管理员接口返回；tags 为 JSON 字符串，非数组） */
  type Picture = {
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
    /** 标签（JSON 字符串） */
    tags?: string
    /** 分类 */
    category?: string
    /** 文件体积 */
    picSize?: number | string
    /** 图片宽度 */
    picWidth?: number
    /** 图片高度 */
    picHeight?: number
    /** 图片比例 */
    picScale?: number
    /** 图片格式 */
    picFormat?: string
    /** 图片主色调 */
    picColor?: string
    /** 用户 id */
    userId?: number | string
    /** 空间 id */
    spaceId?: number | string
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
    /** 是否删除：0-未删除 */
    isDelete?: number
  }

  /** 图片标签分类视图 */
  type PictureTagCategory = {
    /** 标签列表 */
    tagList: string[]
    /** 分类列表 */
    categoryList: string[]
  }

  /** 以图搜图结果（站外相似图片） */
  type ImageSearchResult = {
    /** 可直接展示的图片地址 */
    imageUrl?: string
    /** 来源页地址 */
    sourceUrl?: string
    /** 标题/图注 */
    title?: string
  }

  /** 以图搜图请求 */
  type SearchPictureByPictureRequest = {
    /** 站内图片 id */
    pictureId: number | string
    /** 供应商：目前后端只保留 baidu，留空即用其默认服务商 */
    provider?: string
  }

  /** 颜色搜索请求 */
  type SearchPictureByColorRequest = {
    /** 目标颜色（#RRGGBB 或 0xRRGGBB） */
    picColor: string
    /** 空间 id */
    spaceId: number | string
  }

  /** 批量编辑图片请求（仅空间内） */
  type PictureEditByBatchRequest = {
    /** 图片 id 列表 */
    pictureIdList: (number | string)[]
    /** 空间 id */
    spaceId: number | string
    /** 分类（可选） */
    category?: string
    /** 标签（可选） */
    tags?: string[]
    /** 命名规则（可选，支持 {序号} 占位） */
    nameRule?: string
  }

  /** AI 图片编辑任务创建请求 */
  type AiImageEditCreateRequest = {
    /** 要编辑的图片 id */
    pictureId: number | string
    /** 编辑功能，取值见后端 AiImageEditFunctionEnum */
    function: string
    /** 提示词，留空由后端补该功能的默认指令，最长 800 字符 */
    prompt?: string
    /** 向上扩展比例，仅扩图使用，[1.0, 2.0] */
    topScale?: number
    /** 向下扩展比例，仅扩图使用，[1.0, 2.0] */
    bottomScale?: number
    /** 向左扩展比例，仅扩图使用，[1.0, 2.0] */
    leftScale?: number
    /** 向右扩展比例，仅扩图使用，[1.0, 2.0] */
    rightScale?: number
    /** 图像修改幅度，仅全局风格化/指令编辑使用，[0.0, 1.0] */
    strength?: number
    /** 超分放大倍数，仅图像超分使用，1~4 */
    upscaleFactor?: number
    /** 输入图是否为线稿，仅线稿生图使用 */
    isSketch?: boolean
    /** 涂抹蒙版图像（base64 或 data URI），仅局部重绘使用 */
    maskImage?: string
  }

  /** AI 图片编辑结果保存请求（结果地址由服务端按 taskId 取回，前端不传） */
  type AiImageEditSaveRequest = {
    /** 任务 id */
    taskId: string
    /** 图片名称，留空自动生成 */
    picName?: string
    /** true 覆盖原图（原图文件会被删除），false 或留空保存为新图片 */
    replace?: boolean
  }

  /** AI 图片编辑任务视图 */
  type AiImageEditTaskVO = {
    /** 任务 id */
    taskId?: string
    /** 任务状态：PENDING / RUNNING / SUCCEEDED / FAILED / CANCELED / UNKNOWN */
    taskStatus?: string
    /** 任务状态中文文案 */
    statusText?: string
    /** 生成图片地址，成功时非空；24 小时后失效，不能直接入库 */
    imageUrl?: string
    /** 失败原因，任务失败时非空 */
    failReason?: string
  }

  /** AI 图片编辑额度视图 */
  type AiImageEditQuotaVO = {
    /** 剩余可提交次数，取自 user.aiQuota，用完需联系管理员发放（不按天重置） */
    remaining?: number
  }

  /** AI 风格化预设风格 */
  type AiImageEditStyleVO = {
    /** 所属功能：stylization_all / stylization_local */
    function?: string
    /** 风格名称 */
    styleName?: string
    /** 提示词模板，局部风格化含 %s 占位，需替换后再提交 */
    promptTemplate?: string
  }

  /** AI 编辑底图（base64），供本地画布绘制涂抹蒙版 */
  type AiImageEditBaseImageVO = {
    /** 图片 id */
    pictureId?: number | string
    /** 形如 data:image/png;base64,xxx 的完整 data URI */
    dataUrl?: string
    /** 原图宽度（蒙版分辨率必须与之一致） */
    picWidth?: number
    /** 原图高度 */
    picHeight?: number
    /** 原图格式 */
    picFormat?: string
    /** 原图字节数 */
    picSize?: number
  }

  // -------------------- 空间模块 --------------------

  /** 空间创建请求 */
  type SpaceAddRequest = {
    /** 空间名称 */
    spaceName?: string
    /** 空间级别：0-普通版 1-专业版 2-旗舰版 */
    spaceLevel?: number
  }

  /** 空间编辑请求（用户，仅可改名称） */
  type SpaceEditRequest = {
    /** 空间 id */
    id: number | string
    /** 空间名称 */
    spaceName?: string
  }

  /** 空间更新请求（管理员，可改名称/级别/限额） */
  type SpaceUpdateRequest = {
    /** 空间 id */
    id: number | string
    /** 空间名称 */
    spaceName?: string
    /** 空间级别：0-普通版 1-专业版 2-旗舰版 */
    spaceLevel?: number
    /** 图片最大总大小（字节） */
    maxSize?: number
    /** 图片最大数量 */
    maxCount?: number
  }

  /** 空间级别信息 */
  type SpaceLevel = {
    /** 级别值：0/1/2 */
    value: number
    /** 级别名称 */
    text: string
    /** 最大图片数量 */
    maxCount: number
    /** 最大图片总大小（字节） */
    maxSize: number
  }

  /** 空间查询请求 */
  type SpaceQueryRequest = {
    /** 空间 id */
    id?: number | string
    /** 用户 id */
    userId?: number | string
    /** 空间名称 */
    spaceName?: string
    /** 空间级别：0-普通版 1-专业版 2-旗舰版 */
    spaceLevel?: number
    /** 当前页 */
    current?: number
    /** 每页大小 */
    pageSize?: number
    /** 排序字段 */
    sortField?: string
    /** 排序顺序 */
    sortOrder?: string
  }

  /** 空间视图（脱敏） */
  type SpaceVO = {
    /** 空间 id */
    id: number | string
    /** 空间名称 */
    spaceName?: string
    /** 空间级别：0-普通版 1-专业版 2-旗舰版 */
    spaceLevel?: number
    /** 图片最大总大小（字节） */
    maxSize?: number
    /** 图片最大数量 */
    maxCount?: number
    /** 当前图片总大小（字节） */
    totalSize?: number
    /** 当前图片数量 */
    totalCount?: number
    /** 创建用户 id */
    userId?: number | string
    /** 创建时间 */
    createTime?: string
    /** 编辑时间 */
    editTime?: string
    /** 更新时间 */
    updateTime?: string
    /** 创建用户信息 */
    user?: UserVO
  }
}
