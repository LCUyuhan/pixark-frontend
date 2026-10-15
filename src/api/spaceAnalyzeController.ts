import request from '@/request'

/**
 * 空间图库分析接口封装。
 * 查询范围三选一，后端优先级：queryAll > queryPublic > spaceId；三者全空后端直接报「未指定查询范围」
 */

/** 空间资源使用分析（用量 / 配额占比） POST /space/analyze/usage */
export async function getSpaceUsageAnalyze(body: API.SpaceAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceUsageAnalyzeResponse>>('/space/analyze/usage', body)
}

/** 空间图片分类分析 POST /space/analyze/category */
export async function getSpaceCategoryAnalyze(body: API.SpaceAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceCategoryAnalyzeResponse[]>>(
    '/space/analyze/category',
    body,
  )
}

/** 空间图片标签分析（按使用次数降序）POST /space/analyze/tag */
export async function getSpaceTagAnalyze(body: API.SpaceAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceTagAnalyzeResponse[]>>('/space/analyze/tag', body)
}

/** 空间图片大小分段分析 POST /space/analyze/size */
export async function getSpaceSizeAnalyze(body: API.SpaceAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceSizeAnalyzeResponse[]>>('/space/analyze/size', body)
}

/** 用户上传行为分析（日 / 周 / 月）POST /space/analyze/user */
export async function getSpaceUserAnalyze(body: API.SpaceUserAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceUserAnalyzeResponse[]>>('/space/analyze/user', body)
}

/**
 * 空间使用排行（仅管理员）POST /space/analyze/rank
 * 后端返回的是 Space 实体且只填充 id / spaceName / userId / totalSize 四列，其余字段为 undefined
 */
export async function getSpaceRankAnalyze(body: API.SpaceRankAnalyzeRequest) {
  return request.post<API.BaseResponse<API.SpaceVO[]>>('/space/analyze/rank', body)
}
