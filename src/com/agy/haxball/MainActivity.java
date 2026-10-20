package com.agy.haxball;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

import com.agy.telemetry.CrashReporter;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {

    private WebView webView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final String ONLINE_URL = "https://www.haxball.com/play";
    private static final String OFFLINE_URL = "file:///android_asset/offline_practice.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CrashReporter.install(this);

        // Keep screen on during matches
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Support display notch / cutouts
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                getWindow().getAttributes().layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            } catch (Exception ignored) {}
        }

        setContentView(R.layout.activity_main);

        applyImmersiveFullscreen();

        webView = findViewById(R.id.webView);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus(View.FOCUS_DOWN);
        initWebViewSettings();

        // Check if opened via intent (e.g. room link)
        String targetUrl = ONLINE_URL;
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            if (data.toString().contains("haxball.com")) {
                targetUrl = data.toString();
            }
        }

        // Check network connection
        if (isNetworkAvailable()) {
            webView.loadUrl(targetUrl);
        } else {
            Toast.makeText(this, "İnternet bulunamadı. Antrenman moduna geçiliyor.", Toast.LENGTH_LONG).show();
            webView.loadUrl(OFFLINE_URL);
        }
    }

    private void applyImmersiveFullscreen() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (getWindow() != null) {
                    View decorView = getWindow().getDecorView();
                    WindowInsetsController controller = null;
                    if (decorView != null) {
                        controller = decorView.getWindowInsetsController();
                    }
                    if (controller == null) {
                        controller = getWindow().getInsetsController();
                    }
                    if (controller != null) {
                        controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                        controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    }
                }
            } else if (getWindow() != null && getWindow().getDecorView() != null) {
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                );
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initWebViewSettings() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Modern Chrome User Agent
        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " HaxBallMobile/1.0");

        // JavaScript Native Interface
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        // WebChromeClient with WebRTC permission grant & dialog handling
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    CrashReporter.reportCustom(getPackageName(), "JSError",
                            consoleMessage.message(),
                            consoleMessage.sourceId() + ":" + consoleMessage.lineNumber());
                }
                return super.onConsoleMessage(consoleMessage);
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("HaxBall")
                        .setMessage(message)
                        .setPositiveButton("Tamam", (d, w) -> result.confirm())
                        .setCancelable(false)
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("HaxBall")
                        .setMessage(message)
                        .setPositiveButton("Evet", (d, w) -> result.confirm())
                        .setNegativeButton("Hayır", (d, w) -> result.cancel())
                        .setCancelable(false)
                        .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                final EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("HaxBall")
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton("Tamam", (d, w) -> result.confirm(input.getText().toString()))
                        .setNegativeButton("İptal", (d, w) -> result.cancel())
                        .setCancelable(false)
                        .show();
                return true;
            }
        });

        // WebViewClient with mobile script injection
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.contains("haxball.com")) {
                    injectMobileController();
                    // Repeating injection check to ensure iframe binding
                    handler.postDelayed(() -> injectMobileController(), 800);
                    handler.postDelayed(() -> injectMobileController(), 2000);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Bağlantı hatası! Antrenman moduna geçiliyor.", Toast.LENGTH_SHORT).show();
                    view.loadUrl(OFFLINE_URL);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String uri = request.getUrl().toString();
                if (uri.contains("haxball.com") || uri.startsWith("file://")) {
                    return false; // Load inside WebView
                }
                // External URLs opened in browser
                try {
                    Intent ext = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
                    startActivity(ext);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });
    }

    private void injectMobileController() {
        String css = readAssetFile("haxball-controller.css");
        String js = readAssetFile("haxball-controller.js");

        if (!css.isEmpty()) {
            String cssInjection = "javascript:(function() {" +
                    "if (!document.getElementById('injected-hax-css')) {" +
                    "  var s = document.createElement('style');" +
                    "  s.id = 'injected-hax-css';" +
                    "  s.textContent = " + escapeJsString(css) + ";" +
                    "  document.head.appendChild(s);" +
                    "}" +
                    "})()";
            webView.evaluateJavascript(cssInjection, null);
        }

        if (!js.isEmpty()) {
            webView.evaluateJavascript("javascript:" + js, null);
        }
    }

    private String readAssetFile(String filename) {
        try (InputStream is = getAssets().open(filename);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    public static String escapeJsString(String raw) {
        if (raw == null) return "\"\"";
        return "\"" + raw.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "") + "\"";
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo net = cm.getActiveNetworkInfo();
            return net != null && net.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    @Override
    public void onBackPressed() {
        String currentUrl = webView.getUrl();
        if (currentUrl != null && currentUrl.contains("offline_practice.html")) {
            // In offline mode, ask if user wants to go online or exit
            new AlertDialog.Builder(this)
                    .setTitle("HaxBall")
                    .setMessage("Ne yapmak istersiniz?")
                    .setPositiveButton("🌐 Çevrimiçi Oyna", (d, w) -> webView.loadUrl(ONLINE_URL))
                    .setNegativeButton("Çıkış", (d, w) -> finish())
                    .setNeutralButton("Antrenmana Devam", null)
                    .show();
        } else {
            // In online room/game
            new AlertDialog.Builder(this)
                    .setTitle("HaxBall'dan Çık")
                    .setMessage("Oyundan çıkmak veya antrenman moduna geçmek istiyor musunuz?")
                    .setPositiveButton("⚽ Antrenman", (d, w) -> webView.loadUrl(OFFLINE_URL))
                    .setNegativeButton("Çıkış", (d, w) -> finish())
                    .setNeutralButton("İptal", null)
                    .show();
        }
    }

    public static class WebAppInterface {
        private final MainActivity activity;

        WebAppInterface(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void showToast(final String message) {
            activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void vibrate(long milliseconds) {
            try {
                Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(milliseconds);
                    }
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            activity.runOnUiThread(() -> {
                if (activity.webView != null) {
                    activity.webView.loadUrl(url);
                }
            });
        }

        @JavascriptInterface
        public void loadOffline() {
            activity.runOnUiThread(() -> {
                if (activity.webView != null) {
                    activity.webView.loadUrl(OFFLINE_URL);
                }
            });
        }

        @JavascriptInterface
        public void loadOnline(final String url) {
            activity.runOnUiThread(() -> {
                if (activity.webView != null) {
                    activity.webView.loadUrl(url != null && !url.isEmpty() ? url : ONLINE_URL);
                }
            });
        }

        @JavascriptInterface
        public boolean isOnline() {
            return activity.isNetworkAvailable();
        }

        @JavascriptInterface
        public void showSoftKeyboard() {
            activity.runOnUiThread(() -> {
                try {
                    if (activity.webView != null) {
                        activity.webView.requestFocus();
                        InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
                        if (imm != null) {
                            imm.showSoftInput(activity.webView, InputMethodManager.SHOW_IMPLICIT);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void showNativePrompt(final String title, final String message, final String defaultValue, final String callbackAction) {
            activity.runOnUiThread(() -> {
                try {
                    final EditText input = new EditText(activity);
                    input.setText(defaultValue != null ? defaultValue : "");
                    input.setSingleLine(true);
                    input.setSelectAllOnFocus(true);
                    int pad = (int) (16 * activity.getResources().getDisplayMetrics().density);
                    input.setPadding(pad, pad, pad, pad);

                    AlertDialog dialog = new AlertDialog.Builder(activity)
                            .setTitle(title)
                            .setMessage(message)
                            .setView(input)
                            .setPositiveButton("Tamam", (d, w) -> {
                                String text = input.getText().toString();
                                if (activity.webView != null) {
                                    String js = "if(window.__onNativePromptResult){window.__onNativePromptResult(" +
                                            escapeJsString(callbackAction) + "," + escapeJsString(text) + ");}";
                                    activity.webView.evaluateJavascript(js, null);
                                }
                            })
                            .setNegativeButton("İptal", (d, w) -> d.dismiss())
                            .create();

                    dialog.setOnShowListener(d -> {
                        input.requestFocus();
                        InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
                        if (imm != null) {
                            imm.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
                        }
                    });

                    dialog.show();
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public String getClipboardText() {
            try {
                ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                if (clipboard != null && clipboard.hasPrimaryClip() && clipboard.getPrimaryClip().getItemCount() > 0) {
                    CharSequence text = clipboard.getPrimaryClip().getItemAt(0).getText();
                    return text != null ? text.toString() : "";
                }
            } catch (Exception ignored) {}
            return "";
        }

        @JavascriptInterface
        public void copyToClipboard(final String text) {
            activity.runOnUiThread(() -> {
                try {
                    ClipboardManager clipboard = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
                    if (clipboard != null) {
                        ClipData clip = ClipData.newPlainText("HaxBall", text);
                        clipboard.setPrimaryClip(clip);
                        Toast.makeText(activity, "Panoya kopyalandı", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void reportError(String errorType, String message, String stack) {
            CrashReporter.reportCustom(activity.getPackageName(), errorType, message, stack);
        }
    }
}
