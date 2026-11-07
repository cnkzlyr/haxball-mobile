package com.agy.haxball;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.UiModeManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
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

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.media.MediaScannerConnection;
import android.os.Environment;
import android.os.StrictMode;
import android.util.Base64;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity {

    private WebView webView;
    private final Handler handler = new Handler(Looper.getMainLooper());
    public volatile boolean isInputActive = false;
    private static final String ONLINE_URL = "https://www.haxball.com/play";
    private static final String OFFLINE_URL = "file:///android_asset/offline_practice.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CrashReporter.install(this);

        // Disable file exposure strict mode for local APK installer intent
        try {
            StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().build());
        } catch (Exception ignored) {}

        // Listen for OTA download complete to auto-prompt package installer
        try {
            registerReceiver(new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        File dlDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File targetApk = new File(dlDir, "haxball-update.apk");
                        if (targetApk.exists()) {
                            StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().build());
                            Intent installIntent = new Intent(Intent.ACTION_VIEW);
                            installIntent.setDataAndType(Uri.fromFile(targetApk), "application/vnd.android.package-archive");
                            installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(installIntent);
                        }
                    } catch (Exception ignored) {}
                }
            }, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        } catch (Exception ignored) {}

        // Keep screen on during matches
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);

        // Support edge-to-edge display notch / cutouts across full screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                if (Build.VERSION.SDK_INT >= 30) {
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
                } else {
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                }
                getWindow().setAttributes(lp);
            } catch (Exception ignored) {}
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                getWindow().setDecorFitsSystemWindows(false);
            } catch (Exception ignored) {}
        }

        setContentView(R.layout.activity_main);

        // Clear any stale OTA bundle when a newer APK is installed so fresh assets always run
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("HaxBallPrefs", Context.MODE_PRIVATE);
            String lastInstalledVer = prefs.getString("installed_apk_version", "");
            if (!"2.9.0".equals(lastInstalledVer)) {
                File otaDir = new File(getFilesDir(), "ota_bundle");
                if (otaDir.exists()) {
                    File[] files = otaDir.listFiles();
                    if (files != null) {
                        for (File f : files) f.delete();
                    }
                }
                prefs.edit()
                        .putString("installed_apk_version", "2.9.0")
                        .putString("ota_version", "2.9.0")
                        .apply();
            }
        } catch (Exception ignored) {}

        applyImmersiveFullscreen();

        View oldWebView = findViewById(R.id.webView);
        android.view.ViewGroup parentGroup = (android.view.ViewGroup) oldWebView.getParent();
        parentGroup.removeView(oldWebView);

        webView = new WebView(this) {
            @Override
            public android.view.inputmethod.InputConnection onCreateInputConnection(android.view.inputmethod.EditorInfo outAttrs) {
                // Strictly block Android soft keyboard (Gboard) from ever popping up over WebView.
                // Our in-game custom virtual keyboard handles all typing (chat, nickname, password, room search).
                if (outAttrs != null) {
                    outAttrs.inputType = android.text.InputType.TYPE_NULL;
                }
                return null;
            }

            @Override
            public boolean onCheckIsTextEditor() {
                return false;
            }
        };
        webView.setId(R.id.webView);
        webView.setLayoutParams(new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));
        parentGroup.addView(webView);

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
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        try {
            android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        } catch (Exception ignored) {}

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Download listener
        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                if (url != null && !url.startsWith("blob:")) {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(i);
                }
            } catch (Exception ignored) {}
        });

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
        String css = loadControllerBundleFile("haxball-controller.css");
        String js = loadControllerBundleFile("haxball-controller.js");

        if (!css.isEmpty()) {
            String cssInjection = "javascript:(function() {" +
                    "var old = document.getElementById('injected-hax-css');" +
                    "if (old) old.remove();" +
                    "var s = document.createElement('style');" +
                    "s.id = 'injected-hax-css';" +
                    "s.textContent = " + escapeJsString(css) + ";" +
                    "document.head.appendChild(s);" +
                    "})()";
            webView.evaluateJavascript(cssInjection, null);
        }

        if (!js.isEmpty()) {
            webView.evaluateJavascript("javascript:" + js, null);
        }
    }

    private String loadControllerBundleFile(String filename) {
        // 1. Check if hot-updated OTA bundle exists in internal app storage
        try {
            File otaDir = new File(getFilesDir(), "ota_bundle");
            File otaFile = new File(otaDir, filename);
            if (otaFile.exists() && otaFile.length() > 0) {
                try (java.io.FileInputStream fis = new java.io.FileInputStream(otaFile);
                     BufferedReader reader = new BufferedReader(new InputStreamReader(fis, StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    return sb.toString();
                }
            }
        } catch (Exception ignored) {}

        // 2. Fallback to static asset packaged in APK
        return readAssetFile(filename);
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
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK ||
            (event.getSource() & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD) {

            float x = event.getAxisValue(MotionEvent.AXIS_X);
            float y = event.getAxisValue(MotionEvent.AXIS_Y);
            float hatX = event.getAxisValue(MotionEvent.AXIS_HAT_X);
            float hatY = event.getAxisValue(MotionEvent.AXIS_HAT_Y);
            float z = event.getAxisValue(MotionEvent.AXIS_Z);
            float rz = event.getAxisValue(MotionEvent.AXIS_RZ);
            float gas = event.getAxisValue(MotionEvent.AXIS_GAS);
            float brake = event.getAxisValue(MotionEvent.AXIS_BRAKE);

            final String js = String.format(Locale.US,
                "window.__onNativeGamepadMotion && window.__onNativeGamepadMotion(%f, %f, %f, %f, %f, %f, %f, %f);",
                x, y, hatX, hatY, z, rz, gas, brake);
            if (webView != null) {
                webView.evaluateJavascript(js, null);
            }
            return true;
        }
        return super.dispatchGenericMotionEvent(event);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        int source = event.getSource();
        boolean isDown = event.getAction() == KeyEvent.ACTION_DOWN;

        // 1. Hardware Keyboard: Tab toggles/opens chat input
        if (keyCode == KeyEvent.KEYCODE_TAB) {
            if (isDown && webView != null) {
                webView.evaluateJavascript("if(window.__onNativeTabPress){window.__onNativeTabPress();}", null);
            }
            return true; // Prevent Android focus navigation from consuming Tab
        }

        // 2. Hardware Keyboard: Escape closes chat or opens menu
        if (keyCode == KeyEvent.KEYCODE_ESCAPE) {
            if (isDown && webView != null) {
                webView.evaluateJavascript("if(window.__onNativeEscapePress){window.__onNativeEscapePress();}", null);
            }
            return true;
        }

        // 3. Hardware Keyboard: Enter opens chat when not typing
        if (keyCode == KeyEvent.KEYCODE_ENTER && !isInputActive) {
            if (isDown && webView != null) {
                webView.evaluateJavascript("if(window.__onNativeEnterPress){window.__onNativeEnterPress();}", null);
            }
            return true;
        }

        // 4. Hardware Keyboard: Physical kick keys (X, Space, Ctrl) when not typing in chat
        boolean isKickKey = (keyCode == KeyEvent.KEYCODE_SPACE ||
                             keyCode == KeyEvent.KEYCODE_X ||
                             keyCode == KeyEvent.KEYCODE_CTRL_LEFT ||
                             keyCode == KeyEvent.KEYCODE_CTRL_RIGHT);

        if (isKickKey && !isInputActive) {
            if (webView != null) {
                final String js = String.format(Locale.US,
                    "if(window.__onNativeKickKey){window.__onNativeKickKey(%b, %d);}",
                    isDown, keyCode);
                webView.evaluateJavascript(js, null);
            }
            return true; // Stop Space from scrolling page or activating buttons
        }

        // 4. Hardware Keyboard: Movement keys (WASD) when not typing in chat
        if (!isInputActive) {
            String moveKey = null;
            if (keyCode == KeyEvent.KEYCODE_W) moveKey = "KeyW";
            else if (keyCode == KeyEvent.KEYCODE_S) moveKey = "KeyS";
            else if (keyCode == KeyEvent.KEYCODE_A) moveKey = "KeyA";
            else if (keyCode == KeyEvent.KEYCODE_D) moveKey = "KeyD";

            if (moveKey != null) {
                if (webView != null) {
                    final String js = String.format(Locale.US,
                        "if(window.__onNativeMovementKey){window.__onNativeMovementKey('%s', %b);}",
                        moveKey, isDown);
                    webView.evaluateJavascript(js, null);
                }
                return true;
            }
        }

        // 5. Gamepad & Joystick Inputs
        if ((source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
            (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK ||
            KeyEvent.isGamepadButton(keyCode) ||
            keyCode == KeyEvent.KEYCODE_DPAD_UP ||
            keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
            keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
            keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {

            final String js = String.format(Locale.US,
                "window.__onNativeGamepadKey && window.__onNativeGamepadKey(%d, %b);",
                keyCode, isDown);
            if (webView != null) {
                webView.evaluateJavascript(js, null);
            }

            if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                onBackPressed();
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
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
        public void setInputActive(final boolean active) {
            activity.isInputActive = active;
        }

        @JavascriptInterface
        public boolean isTv() {
            try {
                UiModeManager uiModeManager = (UiModeManager) activity.getSystemService(Context.UI_MODE_SERVICE);
                return uiModeManager != null && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
            } catch (Exception e) {
                return false;
            }
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
        public void hideSoftKeyboard() {
            activity.runOnUiThread(() -> {
                try {
                    InputMethodManager imm = (InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        View focusView = activity.getCurrentFocus();
                        if (focusView != null) {
                            imm.hideSoftInputFromWindow(focusView.getWindowToken(), 0);
                        }
                        if (activity.webView != null) {
                            imm.hideSoftInputFromWindow(activity.webView.getWindowToken(), 0);
                        }
                    }
                } catch (Exception ignored) {}
            });
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

        private FileOutputStream currentVideoFos = null;
        private File currentVideoFile = null;

        @JavascriptInterface
        public void saveVideoChunk(final String chunkBase64, final boolean isFirst, final boolean isLast, final String filename) {
            activity.runOnUiThread(() -> {
                try {
                    byte[] videoBytes = Base64.decode(chunkBase64, Base64.DEFAULT);
                    File moviesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "HaxBall");
                    if (!moviesDir.exists()) moviesDir.mkdirs();

                    if (isFirst || currentVideoFos == null) {
                        currentVideoFile = new File(moviesDir, filename);
                        currentVideoFos = new FileOutputStream(currentVideoFile, false);
                    }

                    currentVideoFos.write(videoBytes);
                    currentVideoFos.flush();

                    if (isLast) {
                        try {
                            currentVideoFos.close();
                        } catch (Exception ignored) {}
                        currentVideoFos = null;

                        String mime = filename.endsWith(".mp4") ? "video/mp4" : "video/webm";

                        // 1. Scan file into Android Gallery / MediaStore
                        MediaScannerConnection.scanFile(
                                activity,
                                new String[]{currentVideoFile.getAbsolutePath()},
                                new String[]{mime},
                                null
                        );

                        // 2. Backup copy in Downloads
                        try {
                            File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File dlFile = new File(downloadDir, filename);
                            try (FileOutputStream fosDl = new FileOutputStream(dlFile);
                                 java.io.FileInputStream fis = new java.io.FileInputStream(currentVideoFile)) {
                                byte[] buf = new byte[8192];
                                int len;
                                while ((len = fis.read(buf)) > 0) {
                                    fosDl.write(buf, 0, len);
                                }
                                fosDl.flush();
                            }
                            MediaScannerConnection.scanFile(
                                    activity,
                                    new String[]{dlFile.getAbsolutePath()},
                                    new String[]{mime},
                                    null
                            );
                        } catch (Exception ignored) {}

                        Toast.makeText(activity, "📹 8sn Gol Videosu Galeriye Kaydedildi!", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    try {
                        if (currentVideoFos != null) currentVideoFos.close();
                    } catch (Exception ignored) {}
                    currentVideoFos = null;
                    Toast.makeText(activity, "Kayıt hatası: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void shareVideo(final String filename) {
            activity.runOnUiThread(() -> {
                try {
                    File moviesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "HaxBall");
                    File videoFile = new File(moviesDir, filename);
                    if (!videoFile.exists()) {
                        File dlFile = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), filename);
                        if (dlFile.exists()) videoFile = dlFile;
                    }
                    if (videoFile.exists()) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType(filename.endsWith(".mp4") ? "video/mp4" : "video/webm");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, Uri.parse(videoFile.getAbsolutePath()));
                        activity.startActivity(Intent.createChooser(shareIntent, "Gol Videosunu Paylaş"));
                    }
                } catch (Exception e) {
                    Toast.makeText(activity, "Paylaşma hatası: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "2.9.0";
        }

        @JavascriptInterface
        public void downloadAndInstallApk(final String apkUrl) {
            activity.runOnUiThread(() -> {
                try {
                    Toast.makeText(activity, "HaxBall güncellemesi indiriliyor...", Toast.LENGTH_SHORT).show();
                    DownloadManager dm = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        File dlDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File targetApk = new File(dlDir, "haxball-update.apk");
                        if (targetApk.exists()) targetApk.delete();

                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
                        request.setTitle("HaxBall Mobile Güncellemesi");
                        request.setDescription("Yeni sürüm indiriliyor...");
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "haxball-update.apk");
                        request.setMimeType("application/vnd.android.package-archive");
                        dm.enqueue(request);
                    }
                } catch (Exception e) {
                    Toast.makeText(activity, "İndirme hatası: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void installDownloadedApk() {
            activity.runOnUiThread(() -> {
                try {
                    File dlDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File targetApk = new File(dlDir, "haxball-update.apk");
                    if (!targetApk.exists()) {
                        targetApk = new File(dlDir, "haxball-debug.apk");
                    }
                    if (targetApk.exists()) {
                        StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder().build());
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndType(Uri.fromFile(targetApk), "application/vnd.android.package-archive");
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(intent);
                    } else {
                        Toast.makeText(activity, "İndirilen APK bulunamadı", Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(activity, "Kurulum hatası: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public String getOtaVersion() {
            return activity.getSharedPreferences("HaxBallPrefs", Context.MODE_PRIVATE)
                    .getString("ota_version", "2.9.0");
        }

        @JavascriptInterface
        public void saveOtaBundle(final String jsCode, final String cssCode, final String versionTag) {
            activity.runOnUiThread(() -> {
                try {
                    File otaDir = new File(activity.getFilesDir(), "ota_bundle");
                    if (!otaDir.exists()) otaDir.mkdirs();

                    if (jsCode != null && !jsCode.isEmpty()) {
                        File jsFile = new File(otaDir, "haxball-controller.js");
                        try (FileOutputStream fos = new FileOutputStream(jsFile, false)) {
                            fos.write(jsCode.getBytes(StandardCharsets.UTF_8));
                        }
                    }

                    if (cssCode != null && !cssCode.isEmpty()) {
                        File cssFile = new File(otaDir, "haxball-controller.css");
                        try (FileOutputStream fos = new FileOutputStream(cssFile, false)) {
                            fos.write(cssCode.getBytes(StandardCharsets.UTF_8));
                        }
                    }

                    activity.getSharedPreferences("HaxBallPrefs", Context.MODE_PRIVATE)
                            .edit()
                            .putString("ota_version", versionTag)
                            .apply();

                    Toast.makeText(activity, "⚡ HaxBall " + versionTag + " anında güncellendi!", Toast.LENGTH_SHORT).show();

                    if (activity.webView != null) {
                        activity.webView.reload();
                    }
                } catch (Exception e) {
                    Toast.makeText(activity, "OTA kayıt hatası: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void fetchAndApplyOta(final String jsUrl, final String cssUrl, final String versionTag) {
            activity.runOnUiThread(() -> Toast.makeText(activity, "⚡ Canlı güncelleme indiriliyor...", Toast.LENGTH_SHORT).show());
            new Thread(() -> {
                try {
                    String newJs = downloadString(jsUrl);
                    String newCss = downloadString(cssUrl);
                    if (!newJs.isEmpty() && !newCss.isEmpty()) {
                        activity.runOnUiThread(() -> saveOtaBundle(newJs, newCss, versionTag));
                    } else {
                        activity.runOnUiThread(() -> Toast.makeText(activity, "Güncelleme dosyaları indirilemedi", Toast.LENGTH_SHORT).show());
                    }
                } catch (Exception e) {
                    activity.runOnUiThread(() -> Toast.makeText(activity, "OTA İndirme Hatası: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                }
            }).start();
        }

        private String downloadString(String urlStr) {
            try {
                java.net.URL url = new java.net.URL(urlStr);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("User-Agent", "HaxBallMobile-OTA");
                try (InputStream is = conn.getInputStream();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                    return sb.toString();
                }
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void clearOtaBundle() {
            activity.runOnUiThread(() -> {
                try {
                    File otaDir = new File(activity.getFilesDir(), "ota_bundle");
                    if (otaDir.exists()) {
                        File[] files = otaDir.listFiles();
                        if (files != null) {
                            for (File f : files) f.delete();
                        }
                    }
                    activity.getSharedPreferences("HaxBallPrefs", Context.MODE_PRIVATE)
                            .edit()
                            .remove("ota_version")
                            .apply();
                    Toast.makeText(activity, "Varsayılan sürüme dönüldü", Toast.LENGTH_SHORT).show();
                    if (activity.webView != null) activity.webView.reload();
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void reportError(String errorType, String message, String stack) {
            CrashReporter.reportCustom(activity.getPackageName(), errorType, message, stack);
        }
    }
}
