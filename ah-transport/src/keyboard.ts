/** Phone keyboard handling: when the on-screen keyboard opens we get a class "kb" on <html>.
 *  CSS then hides the bottom bar and un-pins sticky bars so the form gets the whole screen,
 *  and the focused field is scrolled into view. Works in Chrome, Safari and the Android app. */
export function initKeyboard() {
  const root = document.documentElement, vv = window.visualViewport;
  let max = Math.max(innerHeight, vv?.height ?? 0);
  const update = () => {
    const h = vv?.height ?? innerHeight;
    max = Math.max(max, h, innerHeight);
    root.classList.toggle("kb", max - h > 140);
  };
  vv?.addEventListener("resize", update);
  addEventListener("resize", update);
  addEventListener("orientationchange", () => setTimeout(() => { max = 0; update(); }, 400));
  addEventListener("focusin", (e) => {
    const el = e.target as HTMLElement;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || /checkbox|radio|file|button/.test((el as HTMLInputElement).type || "")) return;
    setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 320);
  });
}
