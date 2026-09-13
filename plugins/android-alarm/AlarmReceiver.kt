package com.voiceassist.ai

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val data = intent.extras ?: return
        if (data.getString("id").isNullOrBlank()) return
        try {
            AlarmScheduler.scheduleNext(context, data)
        } catch (error: Exception) {
            Log.e("VoiceAssistAlarm", "Could not schedule next occurrence", error)
        }
        ContextCompat.startForegroundService(context,
            Intent(context, AlarmPlaybackService::class.java).putExtras(data))
    }
}
