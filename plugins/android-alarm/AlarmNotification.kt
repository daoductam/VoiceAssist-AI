package com.voiceassist.ai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat

object AlarmNotification {
    const val CHANNEL_ID = "native_alarm_playback_v2"
    const val NOTIFICATION_ID = 41001

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val channel = NotificationChannel(CHANNEL_ID, "Báo thức và giọng nói",
            NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Màn hình báo thức; âm thanh do dịch vụ báo thức phát"
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun action(context: Context, data: Bundle, action: String): PendingIntent {
        val intent = Intent(context, AlarmPlaybackService::class.java).apply {
            this.action = action
            putExtra("id", data.getString("id"))
            putExtra("occurrenceId", data.getString("occurrenceId"))
        }
        return PendingIntent.getService(context, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun build(context: Context, data: Bundle): Notification {
        createChannel(context)
        val launch = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("isAlarmRinging", true)
        }
        val fullScreen = PendingIntent.getActivity(context, NOTIFICATION_ID, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.alarm_notification)
            .setContentTitle("${data.getString("time")} • ${data.getString("label")}")
            .setContentText(data.getString("spokenText"))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setFullScreenIntent(fullScreen, true)
            .setContentIntent(fullScreen)
            .addAction(0, "Tắt chuông", action(context, data, AlarmPlaybackService.STOP))
            .addAction(0, "Hoãn ${AlarmScheduler.DEFAULT_SNOOZE_MINUTES} phút", action(context, data, AlarmPlaybackService.SNOOZE))
            .build()
    }
}
