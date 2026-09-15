const TOAST_ID = "fcm-foreground-toast";

export function showForegroundNotification(payload) {
  document.getElementById(TOAST_ID)?.remove();

  const rawUrl = payload?.data?.url;
  const url =
    typeof rawUrl === "string" &&
    rawUrl.startsWith("/") &&
    !rawUrl.startsWith("//")
      ? rawUrl
      : "";

  const toast = document.createElement("button");
  toast.id = TOAST_ID;
  toast.type = "button";
  toast.dir = document.documentElement.dir || "rtl";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.className =
    "fixed left-3 right-3 top-20 z-[100] mx-auto max-w-sm rounded-2xl border border-black/10 bg-white/95 px-4 py-3 text-start shadow-2xl backdrop-blur-md transition active:scale-[0.99] sm:left-auto sm:right-5 sm:w-[360px]";

  const title = document.createElement("span");
  title.className = "block text-sm font-extrabold text-gray-950";
  title.textContent = payload?.notification?.title || "إشعار جديد";
  toast.appendChild(title);

  const message = payload?.notification?.body || "";
  if (message) {
    const body = document.createElement("span");
    body.className = "mt-1 block text-sm leading-6 text-gray-600";
    body.textContent = message;
    toast.appendChild(body);
  }

  toast.addEventListener("click", () => {
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.remove();
  });

  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 6000);
}
