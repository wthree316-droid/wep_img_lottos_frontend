/**
 * Application Constants
 */

export const DEFAULT_CANVAS_CONFIG = {
  width: 1080,
  height: 1920
};

export const DATA_KEYS = {
  LOTTERY_NAME: 'lottery_name',
  LOTTERY_DATE: 'lottery_date',
  WIN: 'win',
  DIGIT_3: 'digit_3',
  DIGIT_2_TOP: 'digit_2_top',
  DIGIT_2_BOTTOM: 'digit_2_bottom',
  RUNNING: 'running',
  // ✅ เพิ่มใหม่
  QR_CODE: 'qr_code',
  LINE_ID: 'line_id'
} as const;

export const IMAGE_CAPTURE_CONFIG = {
  cacheBust: true,
  pixelRatio: 1,
  backgroundColor: '#ffffff'
};

export const BATCH_GENERATION_CONFIG = {
  // เวลารอระหว่างแต่ละรอบ (milliseconds)
  delayBetweenItems: 500,
  // เวลารอหลัง set state (milliseconds)
  stateUpdateDelay: 50,
  // เวลารอให้ render เสร็จ (milliseconds)
  renderDelay: 800
};
