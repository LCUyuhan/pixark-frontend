/**
 * 传给 a-config-provider 的主题种子。
 *
 * 这是全站唯一的主色定义点；src/styles/tokens.css 里手写的 --color-primary 必须与之一致，
 * 否则 AntDV 组件和自己写的样式会分成两种蓝。
 */
export const THEME_SEED = {
  colorPrimary: '#1677ff',
} as const

/** 主题偏好的 localStorage key */
export const THEME_STORAGE_KEY = 'yu-picture-theme'
