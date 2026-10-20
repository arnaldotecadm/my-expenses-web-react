const cache = {};
let currency = "BRL";

const nf = () => (cache[currency] ||= new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "pt-PT", { style: "currency", currency }));

export const setCurrency = (c) => { currency = c || "BRL"; };

export const fmt = (v) => nf().format(Number(v) || 0);

export const fmtK = (v) => {
  const sym = nf().formatToParts(0).find((p) => p.type === "currency")?.value || "";
  return `${(v / 1000).toFixed(Math.abs(v) < 10000 ? 1 : 0).replace(".", ",")}k ${sym}`;
};

export const fmtSigned = (v) => {
  const n = Number(v) || 0;
  return (n >= 0 ? "+ " : "- ") + nf().format(Math.abs(n));
};

export const pct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

export const monthRef = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
