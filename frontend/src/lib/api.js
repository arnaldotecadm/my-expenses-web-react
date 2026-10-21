import axios from "axios";
import { fetchAuthSession, signOut } from "aws-amplify/auth";
import { queryClient } from "@/lib/queryClient";

export const API = `${process.env.REACT_APP_API_URL}/api/v1`;

export const http = axios.create({ baseURL: API });

http.interceptors.request.use(async (config) => {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (idToken) config.headers.Authorization = `Bearer ${idToken}`;
  return config;
});

export const RETURN_KEY = "returnTo";
export const rememberPage = () => {
  const path = window.location.pathname + window.location.search;
  if (path !== "/") sessionStorage.setItem(RETURN_KEY, path);
};

let redirecting = false;
const redirectToLogin = async () => {
  if (redirecting) return;
  redirecting = true;
  rememberPage();
  queryClient.clear();
  try {
    await signOut();
  } finally {
    window.location.replace("/");
  }
};

http.interceptors.response.use((r) => r, async (error) => {
  const cfg = error.config;
  if (error.response?.status !== 401) return Promise.reject(error);
  if (cfg && !cfg._retried) {
    cfg._retried = true;
    try {
      const { tokens } = await fetchAuthSession({ forceRefresh: true });
      const idToken = tokens?.idToken?.toString();
      if (idToken) {
        cfg.headers.Authorization = `Bearer ${idToken}`;
        return http(cfg);
      }
    } catch {
      // refresh failed, fall through to login
    }
  }
  redirectToLogin();
  return Promise.reject(error);
});

const acc = (account) => (account ? { headers: { selectedAccount: account } } : {});
const get = (url, account) => http.get(url, acc(account)).then((r) => r.data);
const abs = (v) => Math.abs(Number(v) || 0);

// Adapters: normalise the original API's shapes for the UI
const mergeCharts = (cur = [], prev = []) => {
  const map = {};
  const add = (list, field) => list.forEach((c) => {
    const row = (map[c.name] ||= { categoryName: c.name, amount: 0, lastMonthAmount: 0, subs: {} });
    row[field] += c.amount;
    c.subCategoryList.forEach((s) => {
      (row.subs[s.name] ||= { name: s.name, amount: 0, lastMonthAmount: 0 })[field] += s.amount;
    });
  });
  add(cur, "amount");
  add(prev, "lastMonthAmount");
  return Object.values(map).map((r) => ({ ...r, subs: Object.values(r.subs).sort((a, b) => b.amount - a.amount) }));
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
  savePlanning: (body, account) => http.post("/planning", body, acc(account)).then((r) => r.data),
  deletePlanning: (uuid, account) => http.delete(`/planning/${uuid}`, acc(account)).then((r) => r.data),
  copyOver: (ym, account) => http.put(`/planning/copy-over/${ym}`, "", acc(account)).then((r) => r.data),
  cleanUp: (ym, account) => http.delete(`/planning/clean-up/${ym}`, acc(account)).then((r) => r.data),

  stats: () => http.get("/statistics/user/records").then((r) => r.data),
  deleteAll: () => http.delete("/statistics/user/records").then((r) => r.data),

  parseFile: (filename, content) => http.post(`/upload/parse/${encodeURIComponent(filename)}`, content, { headers: { "Content-Type": "application/json" } }).then((r) => r.data),
  saveBatch: (body) => http.post("/account", body).then((r) => r.data),
};
