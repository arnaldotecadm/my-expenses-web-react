const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const fmt = (v) => brl.format(Number(v) || 0);

export const fmtSigned = (v) => {
  const n = Number(v) || 0;
  return (n >= 0 ? "+ " : "- ") + brl.format(Math.abs(n));
};

export const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

export const monthRef = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
