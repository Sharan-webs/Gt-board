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
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import java.io.File
import java.net.URL

class MyKeyboardIME : InputMethodService() {

    private lateinit var webView: WebView
    private var themeReceiver: BroadcastReceiver? = null

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateInputView(): View {
        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(NORMAL_HEIGHT_DP)
        )

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.addJavascriptInterface(KeyboardBridge(), "Android")
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                applyStoredThemeIfAny()
            }
        }
        webView.loadUrl("file:///android_asset/index.html")

        registerThemeReceiver()
        return webView
    }

    private fun registerThemeReceiver() {
        if (themeReceiver != null) return
        themeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                applyStoredThemeIfAny()
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
        val file = File(filesDir, "theme_bg.png")
        if (!::webView.isInitialized) return
        Handler(Looper.getMainLooper()).post {
            if (file.exists()) {
                // cache-bust so the WebView doesn't reuse a stale cached image
                val uri = "file://${file.absolutePath}?t=${System.currentTimeMillis()}"
                webView.evaluateJavascript("window.applyThemeBackground && window.applyThemeBackground(${jsString(uri)});", null)
            }
        }
    }

    private fun jsString(s: String): String = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

    private fun setKeyboardHeightDp(heightDp: Int) {
        Handler(Looper.getMainLooper()).post {
            if (::webView.isInitialized) {
                val lp = webView.layoutParams
                lp.height = dp(heightDp)
                webView.layoutParams = lp
                webView.requestLayout()
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
            currentInputConnection?.commitText(text, 1)
        }

        @JavascriptInterface
        fun deleteOne() {
            currentInputConnection?.deleteSurroundingText(1, 0)
        }

        @JavascriptInterface
        fun sendEnter() {
            currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
            currentInputConnection?.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
        }

        @JavascriptInterface
        fun switchToPreviousIme() {
            switchToPreviousInputMethod()
        }

        @JavascriptInterface
        fun expandKeyboard() {
            setKeyboardHeightDp(EXPANDED_HEIGHT_DP)
        }

        @JavascriptInterface
        fun collapseKeyboard() {
            setKeyboardHeightDp(NORMAL_HEIGHT_DP)
        }

        @JavascriptInterface
        fun requestThemeImage() {
            val intent = Intent(this@MyKeyboardIME, ThemePickerActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }

        @JavascriptInterface
        fun commitGif(url: String, mimeType: String) {
            val editorInfo = currentInputEditorInfo
            val supported = editorInfo?.let {
                EditorInfoCompatSupport.supportsMime(it, mimeType)
            } ?: false

            if (!supported) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this@MyKeyboardIME, "This app doesn't accept inline GIFs here", Toast.LENGTH_SHORT).show()
                }
                return
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
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(this@MyKeyboardIME, "Couldn't send GIF: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }.start()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        themeReceiver?.let { try { unregisterReceiver(it) } catch (e: Exception) {} }
        if (::webView.isInitialized) webView.destroy()
    }
}

private object EditorInfoCompatSupport {
    fun supportsMime(editorInfo: android.view.inputmethod.EditorInfo, mimeType: String): Boolean {
        val types = androidx.core.view.inputmethod.EditorInfoCompat.getContentMimeTypes(editorInfo)
        return types.any { it.equals(mimeType, ignoreCase = true) || it == "image/*" }
    }
}
