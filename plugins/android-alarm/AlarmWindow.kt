package com.voiceassist.ai

import android.app.Activity
import android.os.Build
import android.view.WindowManager

object AlarmWindow {
    fun configure(activity: Activity) {
        val ringing = AlarmPlaybackService.activeAlarm != null
        if (Build.VERSION.SDK_INT >= 27) {
            activity.setShowWhenLocked(ringing)
            activity.setTurnScreenOn(ringing)
        } else {
            @Suppress("DEPRECATION")
            val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            if (ringing) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
        }
        if (ringing) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
