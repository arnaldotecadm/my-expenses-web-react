import axios from "axios";
import { fetchAuthSession, signOut } from "aws-amplify/auth";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({ baseURL: API });

http.interceptors.request.use(async (config) => {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (idToken) config.headers.Authorization = `Bearer ${idToken}`;
  return config;
});

http.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401) signOut();
  return Promise.reject(error);
});

const get = (url, account) => http.get(url, { params: { account } }).then((r) => r.data);
const abs = (v) => Math.abs(Number(v) || 0);

// Adapters: normalise the original API's shapes for the UI
const mergeComparison = (rows = []) => Object.values(rows.reduce((acc, r) => {
  const k = r.categoryName || "Uncategorized";
  acc[k] = acc[k] || { categoryName: k, amount: 0, lastMonthAmount: 0 };
  acc[k].amount += abs(r.amount);
  acc[k].lastMonthAmount += abs(r.lastMonthAmount);
  return acc;
}, {}));

const expenseChart = (rows = []) => rows
  .filter((c) => c.amount < 0)
  .map((c) => ({
    name: c.name || "Uncategorized",
    amount: abs(c.amount),
    subCategoryList: (c.subCategoryList || []).filter((s) => s.amount < 0).map((s) => ({ name: s.name || "Other", amount: abs(s.amount) })),
  }));

export const api = {
  accounts: () => http.get("/account").then((r) => r.data),
  allWithSummary: (account) => get("/transaction/all-with-summary", account).then((groups) => groups.map((g) => ({
    ...g, transactionList: (g.transactionList || []).map((t, i) => ({ ...t, uuid: t.uuid || `${g.reference}-${i}` })),
  }))),
  summaryPerCategory: (account) => get("/transaction/summary-per-category", account).then((rows) => rows
    .map((r) => ({ label: r.label || "Uncategorized", values: (r.values || []).slice(-6) }))
    .filter((r) => r.values.reduce((s, v) => s + (Number(v.valor) || 0), 0) < 0)),
  totalsGroupedByMonth: (account) => get("/transaction/totals-grouped-by-month", account).then((rows) =>
    rows.map((r) => ({ ...r, expense: abs(r.expense) }))),
  yearMonth: (account) => get("/transaction/yearMonth", account),

  currentMonthByYM: (y, m, account) => get(`/analise/current-month/${y}/${m}`, account).then((d) => ({
    ...d, income: abs(d.income), expense: abs(d.expense),
  })),
  graphLast4: (account) => get("/analise/graph-last-4-month", account).then((rows) =>
    rows.map((r) => ({ ...r, income: abs(r.income), expense: abs(r.expense) }))),
  comparison: (source, target, account) => get(`/analise/month-analysis-comparison/${source}/${target}`, account).then(mergeComparison),

  categoryChart: (y, m, account) => get(`/category/chart/${y}/${m}`, account).then(expenseChart),

  partyNames: (account) => get("/party/names", account),
  party: (name, account) => get(`/party/${encodeURIComponent(name)}`, account),

  tags: (account) => get("/tag", account),
  tag: (name, account) => get(`/tag/${encodeURIComponent(name)}`, account),

  plannings: (account) => get("/planning", account),
  savePlanning: (body, account) => http.post("/planning", body, { params: { account } }).then((r) => r.data),
  deletePlanning: (uuid, account) => http.delete(`/planning/${uuid}`, { params: { account } }).then((r) => r.data),
  copyOver: (ym, account) => http.put(`/planning/copy-over/${ym}`, "", { params: { account } }).then((r) => r.data),
  cleanUp: (ym, account) => http.delete(`/planning/clean-up/${ym}`, { params: { account } }).then((r) => r.data),

  stats: () => http.get("/statistics/user/records").then((r) => r.data),
  deleteAll: () => http.delete("/statistics/user/records").then((r) => r.data),

  parseFile: (filename, content) => http.post(`/upload/parse/${encodeURIComponent(filename)}`, content, { headers: { "Content-Type": "application/json" } }).then((r) => r.data),
  saveBatch: (body) => http.post("/account", body).then((r) => r.data),
};
