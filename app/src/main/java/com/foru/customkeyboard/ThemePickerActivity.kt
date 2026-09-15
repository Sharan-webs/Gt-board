package com.foru.customkeyboard

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream

/**
 * Small helper screen started by the keyboard when the user taps the
 * Theme button. Not shown in the launcher - only ever opened by the
 * IME itself via startActivity(FLAG_ACTIVITY_NEW_TASK).
 *
 * Flow: pick an image -> crop it to the keyboard's own shape -> save
 * to the app's private files dir. There's no back-channel to the IME
 * service; the keyboard just checks that file's timestamp the next
 * time it's shown (see MyKeyboardIME.onStartInputView).
 */
class ThemePickerActivity : AppCompatActivity() {

    private lateinit var root: FrameLayout
    private var cropView: CropView? = null

    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) {
            finish()
        } else {
            showCropUi(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        root = FrameLayout(this)
        root.setBackgroundColor(Color.BLACK)
        setContentView(root)
        pickImageLauncher.launch("image/*")
    }

    private fun showCropUi(uri: Uri) {
        val bitmap = decodeBitmap(uri)
        if (bitmap == null) {
            finish()
            return
        }

        val dm: DisplayMetrics = resources.displayMetrics
        val targetAspect = dm.widthPixels.toFloat() / (KeyboardMetrics.NORMAL_HEIGHT_DP * dm.density)

        val container = FrameLayout(this)
        val cv = CropView(this, bitmap, targetAspect)
        cropView = cv
        container.addView(
            cv,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )

        val bar = LinearLayout(this)
        bar.orientation = LinearLayout.HORIZONTAL
        bar.setBackgroundColor(Color.parseColor("#CC000000"))
        val barParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dpToPx(64))
        barParams.gravity = Gravity.BOTTOM
        bar.layoutParams = barParams
        bar.setPadding(dpToPx(16), dpToPx(8), dpToPx(16), dpToPx(8))

        val cancelBtn = TextView(this).apply {
            text = "Cancel"
            setTextColor(Color.parseColor("#c3c6cf"))
            textSize = 15f
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
            setOnClickListener { finish() }
        }
        val doneBtn = TextView(this).apply {
            text = "Use Photo"
            setTextColor(Color.parseColor("#4d7cff"))
            textSize = 15f
            gravity = Gravity.CENTER
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
            setOnClickListener { finishCrop() }
        }
        bar.addView(cancelBtn)
        bar.addView(doneBtn)

        val hint = TextView(this).apply {
            text = "Pinch to zoom \u2022 drag to reposition"
            setTextColor(Color.parseColor("#7a7e88"))
            textSize = 11f
            gravity = Gravity.CENTER
        }
        val hintParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        hintParams.gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        hintParams.topMargin = dpToPx(24)
        hint.layoutParams = hintParams

        root.removeAllViews()
        root.addView(container, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(hint)
        root.addView(bar)
    }

    private fun decodeBitmap(uri: Uri): Bitmap? {
        return try {
            // First pass: just read dimensions so we can downsample a
            // huge photo instead of loading it at full resolution.
            val boundsOpts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, boundsOpts) }
            var sample = 1
            val maxDim = 2048
            while ((boundsOpts.outWidth / sample) > maxDim || (boundsOpts.outHeight / sample) > maxDim) {
                sample *= 2
            }
            val opts = BitmapFactory.Options().apply { inSampleSize = sample }
            contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, opts) }
        } catch (e: Exception) {
            null
        }
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()

    private fun finishCrop() {
        val cv = cropView
        val cropped = cv?.getCroppedBitmap()
        if (cropped == null) {
            finish()
            return
        }
        try {
            val file = File(filesDir, KeyboardMetrics.THEME_FILE_NAME)
            FileOutputStream(file).use { out ->
                cropped.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
        } catch (e: Exception) {
            // Keep whatever theme the keyboard already had.
        }
        finish()
    }
}
