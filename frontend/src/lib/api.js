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

http.interceptors.response.use((r) => r, async (error) => {
  const cfg = error.config;
  if (error.response?.status === 401 && cfg && !cfg._retried) {
    cfg._retried = true;
    try {
      const { tokens } = await fetchAuthSession({ forceRefresh: true });
      cfg.headers.Authorization = `Bearer ${tokens?.idToken?.toString()}`;
      return http(cfg);
    } catch {
      signOut();
    }
  } else if (error.response?.status === 401) {
    signOut();
  }
  return Promise.reject(error);
});

const get = (url, account) => http.get(url, { params: { account } }).then((r) => r.data);
const abs = (v) => Math.abs(Number(v) || 0);

// Adapters: normalise the original API's shapes for the UI
const mergeCharts = (cur = [], prev = []) => {
  const map = {};
  cur.forEach((c) => { (map[c.name] ||= { categoryName: c.name, amount: 0, lastMonthAmount: 0 }).amount += c.amount; });
  prev.forEach((c) => { (map[c.name] ||= { categoryName: c.name, amount: 0, lastMonthAmount: 0 }).lastMonthAmount += c.amount; });
  return Object.values(map);
};

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
  // Upstream comparison endpoint mixes months; build it from per-month category charts instead
  comparison: (source, target, account) => Promise.all([source, target].map((ref) => {
    const [y, m] = ref.split("-");
    return get(`/category/chart/${y}/${Number(m)}`, account).then(expenseChart);
  })).then(([cur, prev]) => mergeCharts(cur, prev)),

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
