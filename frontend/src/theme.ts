export const COLORS = {
  background: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceSecondary: "#EFEBE1",
  primary: "#E07A5F",
  primaryHover: "#D16B50",
  secondary: "#81B29A",
  secondaryHover: "#70A089",
  accent: "#7FA3B5",
  accentHover: "#6C92A5",
  textPrimary: "#3D405B",
  textSecondary: "#6A6E8B",
  textLight: "#FFFFFF",
  border: "#E3DDCF",
  error: "#E63946",
  success: "#2A9D8F",
};

export const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + "/api";

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
