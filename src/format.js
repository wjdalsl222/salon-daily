export const krw = (n) => (Number(n) || 0).toLocaleString('ko-KR');

export const krwSigned = (n) => {
  const v = Number(n) || 0;
  return (v > 0 ? '+' : '') + v.toLocaleString('ko-KR');
};

export const hhmm = (s) => {
  if (!s) return '';
  const m = String(s).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
};

export const formatDateKor = (date) => {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 ${dow}요일`;
};
