/**
 * 图片审核状态常量
 * 与后端 PictureReviewStatusEnum 一一对应
 */
export const PIC_REVIEW_STATUS_ENUM = {
  REVIEWING: 0,
  PASS: 1,
  REJECT: 2,
}

/** 审核状态 -> 展示文案 */
export const PIC_REVIEW_STATUS_MAP: Record<number, string> = {
  0: '待审核',
  1: '通过',
  2: '拒绝',
}

/** 审核状态下拉选项 */
export const PIC_REVIEW_STATUS_OPTIONS = Object.keys(PIC_REVIEW_STATUS_MAP).map((key) => {
  const value = Number(key)
  return {
    label: PIC_REVIEW_STATUS_MAP[value],
    value,
  }
})
