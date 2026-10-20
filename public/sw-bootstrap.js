(function () {
  var worker = navigator.serviceWorker;
  if (!worker) return;

  var environment = document.currentScript && document.currentScript.dataset.environment;
  var recoveryKey = "ggmarket-sw-recovery";

  function reloadOnce() {
    if (document.documentElement && document.documentElement.dataset.ggHydrated === "true") return;
    try {
      if (sessionStorage.getItem(recoveryKey)) return;
      sessionStorage.setItem(recoveryKey, "1");
    } catch {
      // A blocked sessionStorage should not prevent recovery.
    }
    location.reload();
  }

  function clearAppCaches() {
    if (!("caches" in globalThis)) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf("ggmarket-") === 0;
      }).map(function (key) {
        return caches.delete(key);
      }));
    });
  }

  function resetStaleWorker() {
    var wasControlled = Boolean(worker.controller);
    return Promise.all([
      worker.getRegistrations().then(function (registrations) {
        return Promise.all(registrations.map(function (registration) {
          return registration.unregister();
        })).then(function () { return registrations.length; });
      }),
      clearAppCaches(),
    ]).then(function (results) {
      if (wasControlled || results[0] > 0) reloadOnce();
    });
  }

  if (environment !== "production") {
    void resetStaleWorker();
    return;
  }

  var controlledAtBoot = Boolean(worker.controller);
  if (controlledAtBoot) worker.addEventListener("controllerchange", reloadOnce, { once: true });
  void worker.register("/sw.js", { updateViaCache: "none" })
    .then(function (registration) { return registration.update(); })
    .catch(function () { return undefined; });

  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "SCRIPT" && target.src && target.src.indexOf("/_next/") !== -1) {
      void resetStaleWorker();
    }
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var message = String(event.reason && (event.reason.message || event.reason));
    if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(message)) {
      void resetStaleWorker();
    }
  });
}());
