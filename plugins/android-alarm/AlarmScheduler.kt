package com.voiceassist.ai

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import java.util.Calendar

object AlarmScheduler {
    const val DEFAULT_SNOOZE_MINUTES = 5

    @Synchronized private fun remember(context: Context, id: String, scheduled: Boolean) {
        val preferences = context.getSharedPreferences("native_alarms", Context.MODE_PRIVATE)
        val ids = preferences.getStringSet("ids", emptySet())!!.toMutableSet()
        if (scheduled) ids.add(id) else ids.remove(id)
        preferences.edit().putStringSet("ids", ids).apply()
    }

    private fun pending(context: Context, data: Bundle, flags: Int): PendingIntent? {
        val id = requireNotNull(data.getString("id"))
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = "com.voiceassist.ai.ALARM.$id"
            putExtras(data)
        }
        return PendingIntent.getBroadcast(context, 0, intent, flags or PendingIntent.FLAG_IMMUTABLE)
    }

    fun schedule(context: Context, data: Bundle, triggerAt: Long) {
        require(!data.getString("id").isNullOrBlank()) { "Alarm ID is required" }
        require(triggerAt > System.currentTimeMillis()) { "Alarm must be in the future" }
        val manager = context.getSystemService(AlarmManager::class.java)
        check(Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) {
            "EXACT_ALARM_PERMISSION"
        }
        val showIntent = PendingIntent.getActivity(context, 0,
            Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, showIntent),
            requireNotNull(pending(context, data, PendingIntent.FLAG_UPDATE_CURRENT)))
        remember(context, requireNotNull(data.getString("id")), true)
    }

    fun cancel(context: Context, id: String) {
        val data = Bundle().apply { putString("id", id) }
        pending(context, data, PendingIntent.FLAG_NO_CREATE)?.let {
            context.getSystemService(AlarmManager::class.java).cancel(it)
            it.cancel()
        }
        remember(context, id, false)
    }

    fun cancelAll(context: Context) {
        val ids = context.getSharedPreferences("native_alarms", Context.MODE_PRIVATE)
            .getStringSet("ids", emptySet())!!.toSet()
        ids.forEach { cancel(context, it) }
    }

    fun scheduleNext(context: Context, data: Bundle) {
        remember(context, requireNotNull(data.getString("id")), false)
        val days = data.getIntArray("repeatDays") ?: return
        if (days.isEmpty()) return
        val parts = requireNotNull(data.getString("time")).split(":")
        val next = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, parts[0].toInt())
            set(Calendar.MINUTE, parts[1].toInt())
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        while (next.timeInMillis <= System.currentTimeMillis() ||
            (next.get(Calendar.DAY_OF_WEEK) + 5) % 7 !in days) {
            next.add(Calendar.DAY_OF_YEAR, 1)
        }
        schedule(context, data, next.timeInMillis)
    }
}
