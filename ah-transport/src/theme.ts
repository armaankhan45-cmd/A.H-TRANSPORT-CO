export type Theme = "dark" | "light";
const KEY = "ah_theme";
export const getTheme = (): Theme => { try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; } };
export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0b1017" : "#edf1f6");
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
export const initTheme = () => applyTheme(getTheme());
