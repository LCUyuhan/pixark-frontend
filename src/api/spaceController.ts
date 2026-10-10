import request from '@/request'

export async function addSpace(params: API.SpaceAddRequest) {
  return request.post<API.BaseResponse<number>>('/space/add', params)
}

export async function deleteSpace(params: { id: number | string }) {
  return request.post<API.BaseResponse<boolean>>('/space/delete', params)
}

export async function editSpace(params: API.SpaceEditRequest) {
  return request.post<API.BaseResponse<boolean>>('/space/edit', params)
}

export async function updateSpace(params: API.SpaceUpdateRequest) {
  return request.post<API.BaseResponse<boolean>>('/space/update', params)
}

export async function listSpaceLevels() {
  return request.get<API.BaseResponse<API.SpaceLevel[]>>('/space/list/level')
}

export async function listSpaceByPage(params: API.SpaceQueryRequest) {
  return request.post<API.BaseResponse<API.Page<API.SpaceVO>>>('/space/list/page', params)
}
