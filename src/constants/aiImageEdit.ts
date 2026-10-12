/**
 * AI 图片编辑常量
 * 取值范围与后端 AiImageEditServiceImpl / AiImageEditFunctionEnum / AiImageEditStyleEnum 保持一致
 */

/** 功能专属参数控件类型 */
export type AiEditParamKind = 'expand' | 'strength' | 'upscale' | 'sketch' | 'none'

export type AiEditFunctionMeta = {
  /** 提交给后端的 function 值 */
  value: string
  /** 下拉展示名 */
  label: string
  /** 一句话说明，展示在功能下拉下方 */
  desc: string
  /** 专属参数控件 */
  param: AiEditParamKind
  /** 是否提供预设风格下拉（对应后端 GET /picture/ai/edit/styles） */
  hasStyles: boolean
  /** 预设风格模板里是否含 %s 占位，需要用户指明作用对象 */
  needObject: boolean
  /**
   * 后端 AiImageEditFunctionEnum.defaultPrompt 为 null 的功能，留空会被 40000 拒绝，
   * 前端提前拦住少一次往返；新增功能时要同步这里
   */
  promptRequired: boolean
  /** 是否需要涂抹蒙版 */
  needMask: boolean
}

export const AI_EDIT_FUNCTIONS: AiEditFunctionMeta[] = [
  {
    value: 'expand',
    label: 'AI 扩图',
    desc: '向指定方向延展画面，保持原有风格与光影',
    param: 'expand',
    hasStyles: false,
    needObject: false,
    promptRequired: false,
    needMask: false,
  },
  {
    value: 'super_resolution',
    label: '图像超分（高清放大）',
    desc: '增强细节提升分辨率，可只高清不放大',
    param: 'upscale',
    hasStyles: false,
    needObject: false,
    promptRequired: false,
    needMask: false,
  },
  {
    value: 'remove_watermark',
    label: '去文字水印',
    desc: '去除画面中的文字，中英文均可',
    param: 'none',
    hasStyles: false,
    needObject: false,
    promptRequired: false,
    needMask: false,
  },
  {
    value: 'description_edit',
    label: '指令编辑',
    desc: '用一句话增改画面内容，无需指定区域',
    param: 'strength',
    hasStyles: false,
    needObject: false,
    promptRequired: true,
    needMask: false,
  },
  {
    value: 'description_edit_with_mask',
    label: '局部重绘',
    desc: '涂抹指定区域后增/删/改内容，默认按周围背景补全',
    param: 'none',
    hasStyles: false,
    needObject: false,
    promptRequired: false,
    needMask: true,
  },
  {
    value: 'stylization_all',
    label: '全局风格化',
    desc: '整图套用预设风格',
    param: 'strength',
    hasStyles: true,
    needObject: false,
    promptRequired: true,
    needMask: false,
  },
  {
    value: 'stylization_local',
    label: '局部风格化',
    desc: '只把某个物体套用预设风格',
    param: 'none',
    hasStyles: true,
    needObject: true,
    promptRequired: true,
    needMask: false,
  },
  {
    value: 'colorization',
    label: '图像上色',
    desc: '黑白或灰度图上色，可用提示词指定颜色倾向',
    param: 'none',
    hasStyles: false,
    needObject: false,
    promptRequired: false,
    needMask: false,
  },
  {
    value: 'doodle',
    label: '线稿生图',
    desc: '提取线稿后按提示词生成图像',
    param: 'sketch',
    hasStyles: false,
    needObject: false,
    promptRequired: true,
    needMask: false,
  },
  {
    value: 'control_cartoon_feature',
    label: '参考卡通形象生图',
    desc: '以图中的卡通形象为参考生成新画面',
    param: 'none',
    hasStyles: false,
    needObject: false,
    promptRequired: true,
    needMask: false,
  },
]

/** 下拉选项，默认入口是扩图 */
export const AI_EDIT_FUNCTION_OPTIONS = AI_EDIT_FUNCTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}))

export const AI_EDIT_DEFAULT_FUNCTION = 'expand'

export const getAiEditFunctionMeta = (value: string): AiEditFunctionMeta =>
  AI_EDIT_FUNCTIONS.find((item) => item.value === value) ?? AI_EDIT_FUNCTIONS[0]

/** 扩展比例范围，与后端 validExpandScale 的 [1.0, 2.0] 一致 */
export const AI_EDIT_SCALE_MIN = 1.0
export const AI_EDIT_SCALE_MAX = 2.0
export const AI_EDIT_SCALE_STEP = 0.1

/** 四个扩展方向，决定 slider 的渲染顺序与字段名 */
export const AI_EDIT_SCALE_DIRECTIONS = [
  { key: 'topScale', label: '向上' },
  { key: 'bottomScale', label: '向下' },
  { key: 'leftScale', label: '向左' },
  { key: 'rightScale', label: '向右' },
] as const

/** 默认左右各扩 1.2 倍，上下不扩（横图向两侧延展观感最自然） */
export const AI_EDIT_DEFAULT_SCALES = {
  topScale: 1.0,
  bottomScale: 1.0,
  leftScale: 1.2,
  rightScale: 1.2,
}

/** 修改幅度范围，与后端 validStrength 一致；越接近 1 对原图改动越大 */
export const AI_EDIT_STRENGTH_MIN = 0
export const AI_EDIT_STRENGTH_MAX = 1
export const AI_EDIT_STRENGTH_STEP = 0.05
export const AI_EDIT_DEFAULT_STRENGTH = 0.5

/** 超分放大倍数范围，与后端 validUpscaleFactor 一致；1 表示仅高清不放大 */
export const AI_EDIT_UPSCALE_MIN = 1
export const AI_EDIT_UPSCALE_MAX = 4

/** 提示词长度上限，与后端 MAX_PROMPT_LENGTH 一致 */
export const AI_EDIT_PROMPT_MAX_LENGTH = 800

/** 局部风格化模板里的作用对象占位符，与后端 PROMPT_PLACEHOLDER 一致 */
export const AI_EDIT_PROMPT_PLACEHOLDER = '%s'

/** 轮询间隔与次数上限：官方称出图 5~15 秒，这里留 2 分钟排队余量 */
export const AI_EDIT_POLL_INTERVAL_MS = 2000
export const AI_EDIT_POLL_MAX_TIMES = 60

/** 任务状态，与后端 AiImageEditTaskStatusEnum 一致 */
export const AI_EDIT_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
}

/** 涂抹笔刷粗细，按原图宽度的比例换算成原图像素，避免大图小图手感差一个量级 */
export const AI_EDIT_BRUSH_OPTIONS = [
  { label: '细', value: 0.008 },
  { label: '中', value: 0.02 },
  { label: '粗', value: 0.04 },
]

export const AI_EDIT_DEFAULT_BRUSH = 0.02
