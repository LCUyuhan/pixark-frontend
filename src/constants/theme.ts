/**
 * 传给 a-config-provider 的主题种子（亮色）。
 *
 * 这是全站主色的定义点；src/styles/tokens.css 里手写的 --color-primary 必须与之一致，
 * 否则 AntDV 组件和自己写的样式会分成两种颜色。
 *
 * 品牌为黑白灰体系：主色用近黑 #17191D，不用蓝色。
 * 暗色下近黑主色会融进深色背景，所以暗色用独立种子 THEME_SEED_DARK（浅灰主色）。
 */
export const THEME_SEED = {
  colorPrimary: '#17191D',
  borderRadius: 8,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const

/**
 * 暗色主题种子：主色翻成浅灰（黑底白按钮的反转风格）。
 * colorTextLightSolid 是「实色主色按钮上的文字色」，主色变浅后必须翻成深色字，
 * 否则白字落在浅灰按钮上看不见。
 */
export const THEME_SEED_DARK = {
  ...THEME_SEED,
  colorPrimary: '#E8E9EB',
  colorTextLightSolid: 'rgba(0, 0, 0, 0.88)',
} as const

/** 主题偏好的 localStorage key */
export const THEME_STORAGE_KEY = 'yu-picture-theme'
