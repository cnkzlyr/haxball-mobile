// Antigravity WebView JavaScript Error Trap
window.onerror = function(msg, url, line, col, error) {
  const stack = error && error.stack ? error.stack : (url + ":" + line + ":" + col);
  if (window.Android && window.Android.reportError) {
    window.Android.reportError("UncaughtJavaScriptException", msg, stack);
  }
  console.error("JS Error:", msg, stack);
  return false;
};

window.addEventListener("unhandledrejection", function(event) {
  const reason = event.reason ? (event.reason.stack || event.reason) : "Unhandled Promise Rejection";
  if (window.Android && window.Android.reportError) {
    window.Android.reportError("UnhandledPromiseRejection", String(reason), String(reason));
  }
});

let counter = 0;
const counterDisplay = document.getElementById("counterDisplay");
const btnIncrement = document.getElementById("btnIncrement");
const btnVibrate = document.getElementById("btnVibrate");
const btnToast = document.getElementById("btnToast");

if (btnIncrement) {
  btnIncrement.addEventListener("click", () => {
    counter++;
    counterDisplay.textContent = "Tıklama: " + counter;
    if (window.Android && window.Android.vibrate) {
      window.Android.vibrate(30);
    }
  });
}

if (btnVibrate) {
  btnVibrate.addEventListener("click", () => {
    if (window.Android && window.Android.vibrate) {
      window.Android.vibrate(100);
    }
  });
}

if (btnToast) {
  btnToast.addEventListener("click", () => {
    if (window.Android && window.Android.showToast) {
      window.Android.showToast("Antigravity WebView uygulaması devrede!");
    }
  });
}
