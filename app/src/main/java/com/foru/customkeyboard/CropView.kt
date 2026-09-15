package com.foru.customkeyboard

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View

/**
 * Minimal pinch-zoom-and-pan crop surface, no external libraries.
 *
 * Shows [source] scaled so it always fully covers a centered crop
 * window matching [aspectRatio] (width / height - the keyboard's own
 * shape), dims everything outside that window, and can hand back a
 * bitmap cropped to exactly what's inside the window.
 */
class CropView(
    context: Context,
    private val source: Bitmap,
    private val aspectRatio: Float
) : View(context) {

    private val matrixT = Matrix()
    private var minScale = 1f
    private var curScale = 1f
    private val cropRect = RectF()

    private val dimPaint = Paint().apply { color = Color.parseColor("#B3000000") }
    private val borderPaint = Paint().apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 3f
        isAntiAlias = true
    }

    private val scaleDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val newScale = (curScale * detector.scaleFactor).coerceIn(minScale, minScale * 5f)
                val factor = if (curScale == 0f) 1f else newScale / curScale
                curScale = newScale
                matrixT.postScale(factor, factor, detector.focusX, detector.focusY)
                clampMatrix()
                invalidate()
                return true
            }
        }
    )

    private var lastX = 0f
    private var lastY = 0f
    private var dragging = false

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w <= 0 || h <= 0) return
        setupCropRect(w, h)
        setupInitialMatrix()
    }

    private fun setupCropRect(w: Int, h: Int) {
        val margin = w * 0.06f
        var cw = w - margin * 2
        var ch = cw / aspectRatio
        if (ch > h * 0.82f) {
            ch = h * 0.82f
            cw = ch * aspectRatio
        }
        val left = (w - cw) / 2f
        val top = (h - ch) / 2f
        cropRect.set(left, top, left + cw, top + ch)
    }

    private fun setupInitialMatrix() {
        if (cropRect.width() <= 0 || cropRect.height() <= 0) return
        if (source.width <= 0 || source.height <= 0) return
        val scaleX = cropRect.width() / source.width
        val scaleY = cropRect.height() / source.height
        minScale = maxOf(scaleX, scaleY)
        curScale = minScale
        matrixT.reset()
        matrixT.postScale(minScale, minScale)
        val scaledW = source.width * minScale
        val scaledH = source.height * minScale
        val dx = cropRect.left - (scaledW - cropRect.width()) / 2f
        val dy = cropRect.top - (scaledH - cropRect.height()) / 2f
        matrixT.postTranslate(dx, dy)
        invalidate()
    }

    private fun clampMatrix() {
        val values = FloatArray(9)
        matrixT.getValues(values)
        var scale = values[Matrix.MSCALE_X]
        if (scale < minScale) {
            val factor = if (scale == 0f) 1f else minScale / scale
            matrixT.postScale(factor, factor, cropRect.centerX(), cropRect.centerY())
            matrixT.getValues(values)
            scale = values[Matrix.MSCALE_X]
        }
        val scaledW = source.width * scale
        val scaledH = source.height * scale
        var dx = values[Matrix.MTRANS_X]
        var dy = values[Matrix.MTRANS_Y]

        if (scaledW <= cropRect.width()) {
            dx = cropRect.left + (cropRect.width() - scaledW) / 2f
        } else {
            if (dx > cropRect.left) dx = cropRect.left
            if (dx + scaledW < cropRect.right) dx = cropRect.right - scaledW
        }
        if (scaledH <= cropRect.height()) {
            dy = cropRect.top + (cropRect.height() - scaledH) / 2f
        } else {
            if (dy > cropRect.top) dy = cropRect.top
            if (dy + scaledH < cropRect.bottom) dy = cropRect.bottom - scaledH
        }
        values[Matrix.MTRANS_X] = dx
        values[Matrix.MTRANS_Y] = dy
        matrixT.setValues(values)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x; lastY = event.y; dragging = true
            }
            MotionEvent.ACTION_MOVE -> {
                if (dragging && !scaleDetector.isInProgress && event.pointerCount == 1) {
                    val dx = event.x - lastX
                    val dy = event.y - lastY
                    matrixT.postTranslate(dx, dy)
                    clampMatrix()
                    invalidate()
                }
                lastX = event.x; lastY = event.y
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> dragging = false
        }
        return true
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(Color.parseColor("#0e0f13"))
        canvas.save()
        canvas.clipRect(cropRect)
        canvas.drawBitmap(source, matrixT, null)
        canvas.restore()

        // Dim everything outside the crop window.
        canvas.save()
        val path = Path()
        path.addRect(0f, 0f, width.toFloat(), height.toFloat(), Path.Direction.CW)
        path.addRect(cropRect, Path.Direction.CCW)
        canvas.drawPath(path, dimPaint)
        canvas.restore()

        canvas.drawRect(cropRect, borderPaint)
    }

    /** Returns the cropped (and size-capped) bitmap, or null on failure. */
    fun getCroppedBitmap(): Bitmap? {
        return try {
            val inverse = Matrix()
            if (!matrixT.invert(inverse)) return null
            val srcRect = RectF(cropRect)
            inverse.mapRect(srcRect)
            val left = srcRect.left.toInt().coerceIn(0, source.width - 1)
            val top = srcRect.top.toInt().coerceIn(0, source.height - 1)
            val right = srcRect.right.toInt().coerceIn(left + 1, source.width)
            val bottom = srcRect.bottom.toInt().coerceIn(top + 1, source.height)
            val cropped = Bitmap.createBitmap(source, left, top, right - left, bottom - top)

            val maxW = 1080
            if (cropped.width > maxW) {
                val scale = maxW.toFloat() / cropped.width
                Bitmap.createScaledBitmap(cropped, maxW, (cropped.height * scale).toInt(), true)
            } else {
                cropped
            }
        } catch (e: Exception) {
            null
        }
    }
}
