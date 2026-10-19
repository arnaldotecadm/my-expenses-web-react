import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const http = axios.create({ baseURL: API });

// account is injected per-request by callers via params
export const api = {
  accounts: () => http.get("/account").then((r) => r.data),
  allWithSummary: (account) => http.get("/transaction/all-with-summary", { params: { account } }).then((r) => r.data),
  summaryPerCategory: (account) => http.get("/transaction/summary-per-category", { params: { account } }).then((r) => r.data),
  totalsGroupedByMonth: (account) => http.get("/transaction/totals-grouped-by-month", { params: { account } }).then((r) => r.data),
  yearMonth: (account) => http.get("/transaction/yearMonth", { params: { account } }).then((r) => r.data),

  currentMonth: (account) => http.get("/analise/current-month", { params: { account } }).then((r) => r.data),
  currentMonthByYM: (y, m, account) => http.get(`/analise/current-month/${y}/${m}`, { params: { account } }).then((r) => r.data),
  monthAnalysis: (y, m, account) => http.get(`/analise/month-analysis/${y}/${m}`, { params: { account } }).then((r) => r.data),
  graphLast4: (account) => http.get("/analise/graph-last-4-month", { params: { account } }).then((r) => r.data),
  comparison: (source, target, account) => http.get(`/analise/month-analysis-comparison/${source}/${target}`, { params: { account } }).then((r) => r.data),

  categoryChart: (y, m, account) => http.get(`/category/chart/${y}/${m}`, { params: { account } }).then((r) => r.data),
  categories: (account) => http.get("/category", { params: { account } }).then((r) => r.data),

  budgets: (account) => http.get("/budget", { params: { account } }).then((r) => r.data),
  budget: (uuid) => http.get(`/budget/${uuid}`).then((r) => r.data),
  saveBudget: (body) => http.post("/budget", body).then((r) => r.data),
  budgetAnalysis: (account) => http.get("/budget/analysis", { params: { account } }).then((r) => r.data),
  budgetAnalysisDetail: (uuid, account) => http.get(`/budget/analysis/${uuid}`, { params: { account } }).then((r) => r.data),

  partyNames: (account) => http.get("/party/names", { params: { account } }).then((r) => r.data),
  party: (name, account) => http.get(`/party/${encodeURIComponent(name)}`, { params: { account } }).then((r) => r.data),

  tags: (account) => http.get("/tag", { params: { account } }).then((r) => r.data),
  tag: (name, account) => http.get(`/tag/${encodeURIComponent(name)}`, { params: { account } }).then((r) => r.data),

  plannings: (account) => http.get("/planning", { params: { account } }).then((r) => r.data),
  planningSummary: (start, end, account) => http.get(`/planning/${start}/${end}`, { params: { account } }).then((r) => r.data),
  savePlanning: (body) => http.post("/planning", body).then((r) => r.data),
  deletePlanning: (uuid) => http.delete(`/planning/${uuid}`).then((r) => r.data),
  copyOver: (ym, account) => http.put(`/planning/copy-over/${ym}`, {}, { params: { account } }).then((r) => r.data),
  cleanUp: (ym, account) => http.delete(`/planning/clean-up/${ym}`, { params: { account } }).then((r) => r.data),

  stats: (account) => http.get("/statistics/user/records", { params: { account } }).then((r) => r.data),
  deleteAll: () => http.delete("/statistics/user/records").then((r) => r.data),

  parseFile: (filename, content) => http.post(`/upload/parse/${encodeURIComponent(filename)}`, content, { headers: { "Content-Type": "application/json" } }).then((r) => r.data),
  saveBatch: (body) => http.post("/account", body).then((r) => r.data),
};
