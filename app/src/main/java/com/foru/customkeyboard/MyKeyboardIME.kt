package com.foru.customkeyboard

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.core.view.inputmethod.InputConnectionCompat
import androidx.core.view.inputmethod.InputContentInfoCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URL

class MyKeyboardIME : InputMethodService() {

    private lateinit var webView: WebView
    private var clipboardManager: ClipboardManager? = null
    private var lastThemeStamp = -1L

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    // ---------- clipboard history ----------

    private val clipListener = ClipboardManager.OnPrimaryClipChangedListener {
        val cm = clipboardManager ?: return@OnPrimaryClipChangedListener
        val clip = cm.primaryClip ?: return@OnPrimaryClipChangedListener
        if (clip.itemCount == 0) return@OnPrimaryClipChangedListener
        val text = clip.getItemAt(0).coerceToText(this@MyKeyboardIME)?.toString()?.trim()
        if (text.isNullOrEmpty()) return@OnPrimaryClipChangedListener
        val history = loadClipHistory()
        history.remove(text)
        history.add(0, text)
        while (history.size > MAX_CLIP_ITEMS) history.removeAt(history.size - 1)
        saveClipHistory(history)
    }

    private fun prefs() = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

    private fun loadClipHistory(): MutableList<String> {
        val raw = prefs().getString(KEY_CLIP_HISTORY, "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            MutableList(arr.length()) { arr.getString(it) }
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    private fun saveClipHistory(list: List<String>) {
        val arr = JSONArray()
        list.forEach { arr.put(it) }
        prefs().edit().putString(KEY_CLIP_HISTORY, arr.toString()).apply()
    }

    // ---------- theme background ----------

    private fun themeDataUrl(): String {
        val file = File(filesDir, KeyboardMetrics.THEME_FILE_NAME)
        if (!file.exists()) return ""
        return try {
            val bytes = file.readBytes()
            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            "data:image/jpeg;base64,$b64"
        } catch (e: Exception) {
            ""
        }
    }

    private fun checkThemeUpdate() {
        val file = File(filesDir, KeyboardMetrics.THEME_FILE_NAME)
        val stamp = if (file.exists()) file.lastModified() else 0L
        if (stamp == lastThemeStamp) return
        lastThemeStamp = stamp
        val dataUrl = if (file.exists()) themeDataUrl() else ""
        Handler(Looper.getMainLooper()).post {
            if (::webView.isInitialized) {
                webView.evaluateJavascript(
                    "window.applyThemeFromNative && window.applyThemeFromNative(${JSONObject.quote(dataUrl)})",
                    null
                )
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateInputView(): View {
        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(KeyboardMetrics.NORMAL_HEIGHT_DP)
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

    override fun onCreate() {
        super.onCreate()
        clipboardManager = getSystemService(CLIPBOARD_SERVICE) as? ClipboardManager
        clipboardManager?.addPrimaryClipChangedListener(clipListener)
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        checkThemeUpdate()
    }

    private var heightAnimator: ValueAnimator? = null

    private fun setKeyboardHeightDp(heightDp: Int) {
        Handler(Looper.getMainLooper()).post {
            if (!::webView.isInitialized) return@post
            val targetPx = dp(heightDp)
            val startPx = webView.layoutParams.height.takeIf { it > 0 } ?: targetPx
            if (startPx == targetPx) return@post

            heightAnimator?.cancel()
            val animator = ValueAnimator.ofInt(startPx, targetPx)
            animator.duration = 180
            animator.interpolator = DecelerateInterpolator()
            animator.addUpdateListener { anim ->
                val lp = webView.layoutParams
                lp.height = anim.animatedValue as Int
                webView.layoutParams = lp
            }
            animator.start()
            heightAnimator = animator
        }
    }

    // Everything the web UI calls to actually type into whatever app is focused
    // (and a few native-only things: clipboard history, theme photo picking).
    inner class KeyboardBridge {

        @JavascriptInterface
        fun commitText(text: String) {
            currentInputConnection?.commitText(text, 1)
        }

        @JavascriptInterface
        fun pasteText(text: String) {
            currentInputConnection?.commitText(text, 1)
        }

        @JavascriptInterface
        fun deleteOne() {
            currentInputConnection?.deleteSurroundingText(1, 0)
        }

        // Triple-tap-to-clear on the backspace key. Grabs a generous
        // chunk of text on both sides of the cursor and deletes it -
        // the standard IME trick for "clear this field" without needing
        // selection APIs the target app may not support.
        @JavascriptInterface
        fun clearAll() {
            val ic = currentInputConnection ?: return
            val before = ic.getTextBeforeCursor(10000, 0)?.length ?: 0
            val after = ic.getTextAfterCursor(10000, 0)?.length ?: 0
            if (before > 0 || after > 0) ic.deleteSurroundingText(before, after)
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

        // Called when a floating box (emoji / AI / phrases / translate /
        // clipboard) opens. Adds room ABOVE the key rows; the key rows
        // themselves never change size.
        @JavascriptInterface
        fun expandKeyboard() {
            setKeyboardHeightDp(KeyboardMetrics.EXPANDED_HEIGHT_DP)
        }

        @JavascriptInterface
        fun collapseKeyboard() {
            setKeyboardHeightDp(KeyboardMetrics.NORMAL_HEIGHT_DP)
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

        // ---------- clipboard manager ----------

        @JavascriptInterface
        fun getClipHistory(): String {
            val arr = JSONArray()
            loadClipHistory().forEach { arr.put(it) }
            return arr.toString()
        }

        @JavascriptInterface
        fun deleteClipItem(text: String) {
            val history = loadClipHistory()
            history.remove(text)
            saveClipHistory(history)
        }

        // ---------- theme ----------

        @JavascriptInterface
        fun pickThemeImage() {
            val intent = Intent(this@MyKeyboardIME, ThemePickerActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        }

        @JavascriptInterface
        fun getThemeUri(): String = themeDataUrl()

        // ---------- settings ----------

        // "Refresh & restart": wipes everything the keyboard has saved
        // natively (clipboard history, theme photo, cached gifs). The
        // JS side separately clears its own localStorage (API key, saved
        // media list) since that lives in the WebView, not here.
        @JavascriptInterface
        fun resetAllData() {
            prefs().edit().clear().apply()
            File(filesDir, KeyboardMetrics.THEME_FILE_NAME).delete()
            lastThemeStamp = -1L
            File(cacheDir, "gifs").deleteRecursively()
        }

        @JavascriptInterface
        fun openUrl(url: String) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
            } catch (e: Exception) {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(this@MyKeyboardIME, "Couldn't open link", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        clipboardManager?.removePrimaryClipChangedListener(clipListener)
        if (::webView.isInitialized) webView.destroy()
    }

    companion object {
        private const val PREFS_NAME = "gt_keyboard_prefs"
        private const val KEY_CLIP_HISTORY = "clip_history"
        private const val MAX_CLIP_ITEMS = 40
    }
}

private object EditorInfoCompatSupport {
    fun supportsMime(editorInfo: android.view.inputmethod.EditorInfo, mimeType: String): Boolean {
        val types = androidx.core.view.inputmethod.EditorInfoCompat.getContentMimeTypes(editorInfo)
        return types.any { it.equals(mimeType, ignoreCase = true) || it == "image/*" }
    }
}
