export function phoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatPhone(value: string) {
  const digits = phoneDigits(value);
  const areaCode = digits.slice(0, 2);
  const firstPart = digits.slice(2, 7);
  const secondPart = digits.slice(7, 11);

  if (digits.length <= 2) return areaCode ? `(${areaCode}` : "";
  if (digits.length <= 7) return `(${areaCode})${firstPart}`;
  return `(${areaCode})${firstPart}-${secondPart}`;
}
