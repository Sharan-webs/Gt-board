package com.foru.customkeyboard

import android.annotation.SuppressLint
import android.content.ClipDescription
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import java.io.File
import java.net.URL

class MyKeyboardIME : InputMethodService() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateInputView(): View {
        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.addJavascriptInterface(KeyboardBridge(), "Android")
        webView.loadUrl("file:///android_asset/index.html")

        return webView
    }

    // Everything the web UI calls to actually type into whatever app is focused
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

        // Called from JS when the user taps a GIF/sticker. Downloads it and
        // sends it as real inline content - same mechanism Gboard uses.
        // Falls back to a toast if the app the user is typing into (e.g. a
        // plain text field) doesn't support inline images.
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
        if (::webView.isInitialized) webView.destroy()
    }
}

private object EditorInfoCompatSupport {
    fun supportsMime(editorInfo: android.view.inputmethod.EditorInfo, mimeType: String): Boolean {
        val types = androidx.core.view.inputmethod.EditorInfoCompat.getContentMimeTypes(editorInfo)
        return types.any { it.equals(mimeType, ignoreCase = true) || it == "image/*" }
    }
}
