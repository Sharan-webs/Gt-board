package com.foru.customkeyboard

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.ClipDescription
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import java.io.File
import java.net.URL

private const val TAG = "GTKeyboard"

class MyKeyboardIME : InputMethodService() {

    private var webView: WebView? = null
    private var themeReceiver: BroadcastReceiver? = null

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateInputView(): View {
        return try {
            buildWebViewKeyboard()
        } catch (e: Throwable) {
            Log.e(TAG, "onCreateInputView failed, showing fallback view", e)
            fallbackView(e)
        }
    }

    private fun buildWebViewKeyboard(): View {
        val wv = WebView(this)
        wv.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(NORMAL_HEIGHT_DP)
        )

        val settings = wv.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_NO_CACHE

        wv.addJavascriptInterface(KeyboardBridge(), "Android")
        wv.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                safe("applyStoredThemeIfAny") { applyStoredThemeIfAny() }
            }
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                Log.e(TAG, "WebView load error $errorCode: $description ($failingUrl)")
            }
        }

        webView = wv
        wv.loadUrl("file:///android_asset/index.html")
        safe("registerThemeReceiver") { registerThemeReceiver() }
        return wv
    }

    private fun fallbackView(error: Throwable): View {
        val tv = TextView(this)
        tv.text = "GT Keyboard failed to load.\n${error.javaClass.simpleName}: ${error.message}\nSwitch keyboard to retry."
        tv.setTextColor(0xFFFFFFFF.toInt())
        tv.setBackgroundColor(0xFF17181E.toInt())
        tv.setPadding(dp(16), dp(16), dp(16), dp(16))
        tv.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(NORMAL_HEIGHT_DP))
        return tv
    }

    private inline fun safe(label: String, block: () -> Unit) {
        try { block() } catch (e: Throwable) { Log.e(TAG, "$label failed", e) }
    }

    private fun registerThemeReceiver() {
        if (themeReceiver != null) return
        themeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                safe("applyStoredThemeIfAny(receiver)") { applyStoredThemeIfAny() }
            }
        }
        val filter = IntentFilter("com.foru.customkeyboard.THEME_UPDATED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.registerReceiver(this, themeReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(themeReceiver, filter)
        }
    }

    private fun applyStoredThemeIfAny() {
        val wv = webView ?: return
        val file = File(filesDir, "theme_bg.png")
        Handler(Looper.getMainLooper()).post {
            safe("evaluateJavascript(theme)") {
                if (file.exists()) {
                    val uri = "file://${file.absolutePath}?t=${System.currentTimeMillis()}"
                    wv.evaluateJavascript("window.applyThemeBackground && window.applyThemeBackground(${jsString(uri)});", null)
                }
            }
        }
    }

    private fun jsString(s: String): String = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

    private fun setKeyboardHeightDp(heightDp: Int) {
        Handler(Looper.getMainLooper()).post {
            safe("setKeyboardHeightDp") {
                val wv = webView ?: return@safe
                val lp = wv.layoutParams
                lp.height = dp(heightDp)
                wv.layoutParams = lp
                wv.requestLayout()
            }
        }
    }

    companion object {
        const val NORMAL_HEIGHT_DP = 270
        const val EXPANDED_HEIGHT_DP = 480
    }

    inner class KeyboardBridge {

        @JavascriptInterface
        fun commitText(text: String) {
            safe("commitText") { currentInputConnection?.commitText(text, 1) }
        }

        @JavascriptInterface
        fun deleteOne() {
            safe("deleteOne") { currentInputConnection?.deleteSurroundingText(1, 0) }
        }

        @JavascriptInterface
        fun sendEnter() {
            safe("sendEnter") {
                currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
                currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
            }
        }

        @JavascriptInterface
        fun switchToPreviousIme() {
            safe("switchToPreviousIme") { switchToPreviousInputMethod() }
        }

        @JavascriptInterface
        fun expandKeyboard() {
            safe("expandKeyboard") { setKeyboardHeightDp(EXPANDED_HEIGHT_DP) }
        }

        @JavascriptInterface
        fun collapseKeyboard() {
            safe("collapseKeyboard") { setKeyboardHeightDp(NORMAL_HEIGHT_DP) }
        }

        @JavascriptInterface
        fun requestThemeImage() {
            safe("requestThemeImage") {
                val intent = Intent(this@MyKeyboardIME, ThemePickerActivity::class.java)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
            }
        }

        @JavascriptInterface
        fun commitGif(url: String, mimeType: String) {
            safe("commitGif") {
                val editorInfo = currentInputEditorInfo
                val supported = editorInfo?.let { EditorInfoCompatSupport.supportsMime(it, mimeType) } ?: false

                if (!supported) {
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(this@MyKeyboardIME, "This app doesn't accept inline GIFs here", Toast.LENGTH_SHORT).show()
                    }
                    return@safe
                }

                Thread {
                    try {
                        val bytes = URL(url).openStream().use { it.readBytes() }
                        val dir = File(cacheDir, "gifs").apply { mkdirs() }
                        val file = File(dir, "shared_${System.currentTimeMillis()}.gif")
                        file.writeBytes(bytes)

                        val contentUri: Uri = FileProvider.getUriForFile(
                            this@MyKeyboardIME, "com.foru.customkeyboard.fileprovider", file
                        )
                        val description = ClipDescription("gif", arrayOf(mimeType))
                        val contentInfo = InputContentInfoCompat(contentUri, description, null)

                        Handler(Looper.getMainLooper()).post {
                            currentInputConnection?.let { ic ->
                                InputConnectionCompat.commitContent(
                                    ic, currentInputEditorInfo!!, contentInfo,
                                    InputConnectionCompat.INPUT_CONTENT_GRANT_READ_URI_PERMISSION, null
                                )
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "commitGif thread failed", e)
                        Handler(Looper.getMainLooper()).post {
                            Toast.makeText(this@MyKeyboardIME, "Couldn't send GIF: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }.start()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        themeReceiver?.let { try { unregisterReceiver(it) } catch (e: Exception) {} }
        webView?.destroy()
        webView = null
    }
}

private object EditorInfoCompatSupport {
    fun supportsMime(editorInfo: android.view.inputmethod.EditorInfo, mimeType: String): Boolean {
        val types = androidx.core.view.inputmethod.EditorInfoCompat.getContentMimeTypes(editorInfo)
        return types.any { it.equals(mimeType, ignoreCase = true) || it == "image/*" }
    }
}
