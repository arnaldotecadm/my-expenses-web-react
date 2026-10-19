export const CHART_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EC4899", "#06B6D4", "#6366F1", "#14B8A6",
  "#F43F5E", "#84CC16", "#A855F7", "#0EA5E9",
];

export const INCOME = "#10B981";
export const EXPENSE = "#EF4444";
export const BALANCE = "#3B82F6";

export const colorAt = (i) => CHART_COLORS[i % CHART_COLORS.length];
