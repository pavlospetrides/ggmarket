export const conditions = [
  ["new", "New"], ["like_new", "Like new"], ["good", "Good"],
  ["fair", "Fair"], ["parts", "For parts"],
] as const;

export const formatPrice = (price: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);

export const labelCondition = (value: string) =>
  conditions.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");
