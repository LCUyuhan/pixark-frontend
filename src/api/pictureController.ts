import request from '@/request'

/**
 * 图片模块 API
 * 与后端 PictureController 一一对应（接口前缀 /picture）
 */

/**
 * 上传图片（可重新上传）POST /picture/upload
 * 注意：后端使用 @RequestPart("file") + PictureUploadRequest 接收，
 * 故采用 multipart/form-data，文件字段名必须为 file，id 作为表单项传递。
 * FormData 的 Content-Type（含 boundary）由浏览器自动设置，无需手动指定
 */
export async function uploadPicture(body: API.PictureUploadRequest, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  // 重新上传时携带图片 id
  if (body.id !== undefined && body.id !== null && body.id !== '') {
    formData.append('id', String(body.id))
  }
  // 上传到私有空间时携带 spaceId
  if (body.spaceId !== undefined && body.spaceId !== null && body.spaceId !== '') {
    formData.append('spaceId', String(body.spaceId))
  }
  return request.post<API.BaseResponse<API.PictureVO>>('/picture/upload', formData)
}

/** 通过 URL 上传图片（可重新上传）POST /picture/upload/url */
export async function uploadPictureByUrl(body: API.PictureUploadRequest) {
  return request.post<API.BaseResponse<API.PictureVO>>('/picture/upload/url', body)
}

/** 批量抓取并上传图片（仅管理员）POST /picture/upload/batch */
export async function uploadPictureByBatch(body: API.PictureUploadByBatchRequest) {
  return request.post<API.BaseResponse<number>>('/picture/upload/batch', body)
}

/** 删除图片（本人或管理员）POST /picture/delete */
export async function deletePicture(body: API.DeleteRequest) {
  return request.post<API.BaseResponse<boolean>>('/picture/delete', body)
}

/** 根据 id 获取图片（仅管理员）GET /picture/get */
export async function getPictureById(params: { id: number | string }) {
  return request.get<API.BaseResponse<API.PictureVO>>('/picture/get', { params })
}

/** 根据 id 获取图片（封装类）GET /picture/get/vo */
export async function getPictureVOById(params: { id: number | string }) {
  return request.get<API.BaseResponse<API.PictureVO>>('/picture/get/vo', { params })
}

/** 分页获取图片原始实体列表（仅管理员；tags 为 JSON 字符串）POST /picture/list/page */
export async function listPictureByPage(body: API.PictureQueryRequest) {
  return request.post<API.BaseResponse<API.Page<API.Picture>>>('/picture/list/page', body)
}

/** 分页获取图片列表（封装类，pageSize 最大 20）POST /picture/list/page/vo */
export async function listPictureVOByPage(body: API.PictureQueryRequest) {
  return request.post<API.BaseResponse<API.Page<API.PictureVO>>>('/picture/list/page/vo', body)
}

/** 我上传的公共图片分页（含待审核/被拒绝；后端强制按登录用户过滤）POST /picture/my/list/page/vo */
export async function listMyPictureVOByPage(body: API.PictureQueryRequest) {
  return request.post<API.BaseResponse<API.Page<API.PictureVO>>>('/picture/my/list/page/vo', body)
}

/** 编辑图片（本人或管理员）POST /picture/edit */
export async function editPicture(body: API.PictureEditRequest) {
  return request.post<API.BaseResponse<boolean>>('/picture/edit', body)
}

/** 图片审核（仅管理员）POST /picture/review */
export async function doPictureReview(body: API.PictureReviewRequest) {
  return request.post<API.BaseResponse<boolean>>('/picture/review', body)
}

/** 获取图片标签分类列表 GET /picture/tag_category */
export async function listPictureTagCategory() {
  return request.get<API.BaseResponse<API.PictureTagCategory>>('/picture/tag_category')
}

/** 以图搜图（站外相似图片，可能耗时数十秒）POST /picture/search/picture */
export async function searchPictureByPicture(body: API.SearchPictureByPictureRequest) {
  return request.post<API.BaseResponse<API.ImageSearchResult[]>>('/picture/search/picture', body)
}

/** 颜色搜索（空间内按主色调相似度前 12）POST /picture/search/color */
export async function searchPictureByColor(body: API.SearchPictureByColorRequest) {
  return request.post<API.BaseResponse<API.PictureVO[]>>('/picture/search/color', body)
}

/** 批量编辑图片（分类/标签/重命名，仅空间内）POST /picture/edit/batch */
export async function editPictureByBatch(body: API.PictureEditByBatchRequest) {
  return request.post<API.BaseResponse<boolean>>('/picture/edit/batch', body)
}

/** 创建 AI 图片编辑任务（只支持异步，需轮询查询接口）POST /picture/ai/edit/create_task */
export async function createAiImageEditTask(body: API.AiImageEditCreateRequest) {
  return request.post<API.BaseResponse<API.AiImageEditTaskVO>>('/picture/ai/edit/create_task', body)
}

/** 查询 AI 图片编辑任务进度（仅任务提交人可查）GET /picture/ai/edit/get_task */
export async function getAiImageEditTask(params: { taskId: string }) {
  return request.get<API.BaseResponse<API.AiImageEditTaskVO>>('/picture/ai/edit/get_task', { params })
}

/** 保存 AI 图片编辑结果，replace 为 true 时覆盖原图 POST /picture/ai/edit/save */
export async function saveAiImageEditResult(body: API.AiImageEditSaveRequest) {
  return request.post<API.BaseResponse<API.PictureVO>>('/picture/ai/edit/save', body)
}

/** 查询当前用户的 AI 编辑额度余量 GET /picture/ai/edit/quota */
export async function getAiImageEditQuota() {
  return request.get<API.BaseResponse<API.AiImageEditQuotaVO>>('/picture/ai/edit/quota')
}

/** 查询风格化功能的预设风格清单 GET /picture/ai/edit/styles */
export async function listAiImageEditStyles(params: { function?: string }) {
  return request.get<API.BaseResponse<API.AiImageEditStyleVO[]>>('/picture/ai/edit/styles', { params })
}

/** 取原图 base64 底图，供本地画布画涂抹蒙版（只读、不消耗日额度）GET /picture/ai/edit/base_image */
export async function getAiImageEditBaseImage(params: { pictureId: number | string }) {
  return request.get<API.BaseResponse<API.AiImageEditBaseImageVO>>('/picture/ai/edit/base_image', { params })
}
