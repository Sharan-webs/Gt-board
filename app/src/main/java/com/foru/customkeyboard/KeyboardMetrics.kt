package com.foru.customkeyboard

/**
 * Shared sizing/config constants. Kept in one place so the IME service
 * and the theme picker/crop activity always agree on the keyboard's
 * "normal" shape (used both for resizing the WebView and for choosing
 * the crop aspect ratio when the user picks a background photo).
 */
object KeyboardMetrics {
    // Height of the actual key rows - this NEVER changes, with or
    // without a floating box open, per the "don't resize the keyboard" rule.
    const val NORMAL_HEIGHT_DP = 270

    // Extra height added above the key rows while a floating box
    // (emoji / AI / phrases / translate / clipboard) is open. Matches
    // the CSS: #floatingArea.open height (see style.css) + a little
    // breathing room, so the WebView is never clipped.
    const val FLOAT_EXTRA_DP = 300

    const val EXPANDED_HEIGHT_DP = NORMAL_HEIGHT_DP + FLOAT_EXTRA_DP

    // File name for the user's chosen + cropped background photo,
    // stored in the app's private files dir.
    const val THEME_FILE_NAME = "theme_bg.jpg"
}
