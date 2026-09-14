package com.foru.customkeyboard

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File
import java.io.FileOutputStream

class ThemePickerActivity : ComponentActivity() {

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            saveAsTheme(uri)
        } else {
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pickImage.launch("image/*")
    }

    private fun saveAsTheme(uri: Uri) {
        Thread {
            try {
                val input = contentResolver.openInputStream(uri)
                // Downscale so we never hold a huge bitmap in memory - "auto fit"
                // is handled purely in CSS (background-size: cover) once saved.
                val options = BitmapFactory.Options().apply { inSampleSize = 2 }
                val bitmap: Bitmap? = BitmapFactory.decodeStream(input, null, options)
                input?.close()

                if (bitmap != null) {
                    val outFile = File(filesDir, "theme_bg.png")
                    FileOutputStream(outFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.PNG, 90, out)
                    }
                    sendBroadcast(Intent("com.foru.customkeyboard.THEME_UPDATED").setPackage(packageName))
                    runOnUiThread { Toast.makeText(this, "Theme updated", Toast.LENGTH_SHORT).show() }
                }
            } catch (e: Exception) {
                runOnUiThread { Toast.makeText(this, "Couldn't set theme: ${e.message}", Toast.LENGTH_SHORT).show() }
            } finally {
                runOnUiThread { finish() }
            }
        }.start()
    }
}
