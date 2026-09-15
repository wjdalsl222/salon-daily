// 결제수단 6종 고정 정의 (추가/삭제 없음)
export const PAYMENT_METHODS = [
  { key: 'card',    label: '카드' },
  { key: 'cash',    label: '현금' },
  { key: 'naverpay',label: '네이버페이' },
  { key: 'asanpay', label: '아산페이' },
  { key: 'bank',    label: '계좌이체' },
  { key: 'etc',     label: '기타' },
];

export const METHOD_ORDER = PAYMENT_METHODS.map((m) => m.key);
export const LABEL_BY_METHOD = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.key, m.label]));

export const emptyItems = () => Object.fromEntries(METHOD_ORDER.map((k) => [k, 0]));

export function todayKST() {
  // 서버 기준 한국 날짜 (Asia/Seoul)
  const s = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Seoul', hour12: false });
  return s.slice(0, 10);
}

export function amountSum(items) {
  return Object.values(items || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}
