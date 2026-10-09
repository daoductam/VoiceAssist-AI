package com.voiceassist.ai

import android.app.Service
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import java.util.UUID

class AlarmPlaybackService : Service() {
    companion object {
        const val STOP = "com.voiceassist.ai.STOP_ALARM"
        const val SNOOZE = "com.voiceassist.ai.SNOOZE_ALARM"
        private const val MAX_RING_MS = 10 * 60 * 1000L
        @Volatile var activeAlarm: Bundle? = null
            private set
        private var instance: AlarmPlaybackService? = null

        fun stopAlarm(id: String) {
            if (activeAlarm?.getString("id") == id) instance?.finishAlarm()
        }

        fun silence(id: String) {
            if (activeAlarm?.getString("id") == id) instance?.audio?.stop()
        }

        fun resumeSound(id: String) {
            val service = instance ?: return
            val data = activeAlarm?.takeIf { it.getString("id") == id } ?: return
            service.audio?.stop()
            service.audio = AlarmAudioPlayer(service).also {
                it.start(requireNotNull(data.getString("spokenText")), data.getBoolean("vibrate", true))
            }
        }

        fun snooze(id: String, minutes: Int = AlarmScheduler.DEFAULT_SNOOZE_MINUTES) {
            val service = instance ?: return
            val data = activeAlarm?.takeIf { it.getString("id") == id } ?: return
            require(minutes > 0) { "Snooze minutes must be positive" }
            val snoozed = Bundle(data).apply {
                putString("id", "${data.getString("id")!!.removeSuffix("_snooze")}_snooze")
                remove("repeatDays")
            }
            AlarmScheduler.schedule(service, snoozed,
                System.currentTimeMillis() + minutes * 60_000L)
            service.finishAlarm()
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var audio: AlarmAudioPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == STOP || intent?.action == SNOOZE) {
            if (activeAlarm?.getString("occurrenceId") == intent.getStringExtra("occurrenceId")) {
                try {
                    val id = intent.getStringExtra("id") ?: return START_NOT_STICKY
                    if (intent.action == SNOOZE) {
                        snooze(id, AlarmScheduler.DEFAULT_SNOOZE_MINUTES)
                    } else {
                        stopAlarm(id)
                    }
                } catch (error: Exception) {
                    Log.e("VoiceAssistAlarm", "Could not snooze; alarm remains active", error)
                }
            }
            if (activeAlarm == null) stopSelf()
            return START_NOT_STICKY
        }
        val data = intent?.extras
        if (data?.getString("id").isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }
        val alarm = Bundle(requireNotNull(data)).apply {
            putString("occurrenceId", UUID.randomUUID().toString())
            if (getString("spokenText").isNullOrBlank()) {
                putString("spokenText", "Đã đến giờ ${getString("label") ?: "báo thức"} rồi bạn ơi!")
            }
        }
        startForeground(AlarmNotification.NOTIFICATION_ID, AlarmNotification.build(this, alarm))
        audio?.stop()
        handler.removeCallbacksAndMessages(null)
        wakeLock?.let { if (it.isHeld) it.release() }
        instance = this
        activeAlarm = alarm
        wakeLock = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VoiceAssistAI:AlarmPlayback")
            .apply { acquire(MAX_RING_MS + 5000) }
        audio = AlarmAudioPlayer(this).also {
            it.start(requireNotNull(alarm.getString("spokenText")), alarm.getBoolean("vibrate", true))
        }
        AndroidAlarmModule.notifyChanged()
        handler.postDelayed({ finishAlarm() }, MAX_RING_MS)
        return START_NOT_STICKY
    }

    private fun finishAlarm() {
        audio?.stop()
        audio = null
        handler.removeCallbacksAndMessages(null)
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        activeAlarm = null
        AndroidAlarmModule.notifyChanged()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        finishAlarm()
        instance = null
        super.onDestroy()
    }
}
