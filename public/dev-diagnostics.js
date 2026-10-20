(function () {
  if (new URLSearchParams(location.search).get("ggdebug") !== "1") return;

  var failedNextAssets = 0;
  var lastSignal = "None";
  var lastControl = "None";
  var panel;

  function safeControlName(control) {
    var name = control.getAttribute("aria-label") || control.textContent || control.tagName.toLowerCase();
    return name.replace(/\s+/g, " ").trim().slice(0, 60);
  }

  function render() {
    if (!panel) return;
    var controls = document.querySelectorAll("[data-gg-debug-control]");
    var enabled = Array.prototype.filter.call(controls, function (control) { return !control.matches(":disabled"); }).length;
    var hydrated = document.documentElement.dataset.ggHydrated === "true";
    var serviceWorker = !("serviceWorker" in navigator) ? "unsupported" : navigator.serviceWorker.controller ? "controlled" : "not controlling";
    panel.querySelector("[data-gg-diagnostic-body]").textContent = [
      "Hydration: " + (hydrated ? "ready" : "waiting"),
      "Secure context: " + (isSecureContext ? "yes" : "no"),
      "randomUUID: " + (typeof crypto.randomUUID === "function" ? "available" : "unavailable"),
      "Service worker: " + serviceWorker,
      "Next assets failed: " + failedNextAssets,
      "Marked controls enabled: " + enabled + "/" + controls.length,
      "Last control: " + lastControl,
      "Last signal: " + lastSignal,
    ].join("\n");
  }

  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "SCRIPT" && target.src && target.src.indexOf("/_next/") !== -1) {
      failedNextAssets += 1;
      lastSignal = "Next script load failure";
    } else if (event.error) {
      lastSignal = "Runtime error: " + (event.error.name || "Error");
    }
    render();
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    lastSignal = "Unhandled rejection: " + (reason && reason.name ? reason.name : "unknown");
    render();
  });

  window.addEventListener("pointerdown", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-gg-debug-control]") : null;
    if (!target) return;
    lastControl = safeControlName(target) + " (" + target.tagName.toLowerCase() + ")";
    render();
  }, true);

  function mount() {
    if (document.getElementById("gg-device-diagnostics")) return;
    panel = document.createElement("aside");
    panel.id = "gg-device-diagnostics";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-label", "GGMarket device diagnostics");
    panel.style.cssText = "position:fixed;z-index:100;left:8px;right:8px;bottom:calc(88px + env(safe-area-inset-bottom));max-height:42vh;overflow:auto;padding:12px;border:1px solid #7762d8;border-radius:12px;background:rgba(8,10,16,.96);color:#f5f3ff;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;pointer-events:none";

    var heading = document.createElement("strong");
    heading.textContent = "GGMarket device diagnostics";
    heading.style.display = "block";
    heading.style.marginBottom = "6px";
    panel.appendChild(heading);

    var body = document.createElement("span");
    body.setAttribute("data-gg-diagnostic-body", "");
    panel.appendChild(body);

    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.setAttribute("aria-label", "Close diagnostics");
    close.style.cssText = "display:block;margin-top:8px;min-height:44px;padding:6px 12px;border:1px solid #8f7aff;border-radius:8px;background:#211a3a;color:white;pointer-events:auto";
    close.addEventListener("click", function () {
      var url = new URL(location.href);
      url.searchParams.delete("ggdebug");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      panel.remove();
      panel = null;
    });
    panel.appendChild(close);
    document.body.appendChild(panel);
    render();
    window.setInterval(render, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
}());
