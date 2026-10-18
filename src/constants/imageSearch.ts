/** 以图搜图任务轮询间隔 */
export const IMAGE_SEARCH_POLL_INTERVAL_MS = 2000

/** 最多轮询多少次（2s × 60 = 2 分钟），超了提示用户手动继续查 */
export const IMAGE_SEARCH_POLL_MAX_TIMES = 60

/** 后端 ImageSearchTaskVO.taskStatus 的取值 */
export const IMAGE_SEARCH_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const
