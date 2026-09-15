// 결제수단 6종 고정 정의 (서버 server/constants.js와 동일하게 유지)
export const PAYMENT_METHODS = [
  { key: 'card',     label: '카드' },
  { key: 'cash',     label: '현금' },
  { key: 'naverpay', label: '네이버페이' },
  { key: 'asanpay',  label: '아산페이' },
  { key: 'bank',     label: '계좌이체' },
  { key: 'etc',      label: '기타' },
];

export const LABEL_BY_METHOD = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.key, m.label]));
