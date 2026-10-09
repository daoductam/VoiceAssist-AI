package com.voiceassist.ai

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class AndroidAlarmModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    companion object {
        private var contextRef = WeakReference<ReactApplicationContext>(null)
        fun notifyChanged() {
            contextRef.get()?.takeIf { it.hasActiveReactInstance() }?.let {
                it.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("NativeAlarmChanged", null)
                it.runOnUiQueueThread { it.currentActivity?.let(AlarmWindow::configure) }
            }
        }
    }

    override fun getName() = "AndroidAlarmModule"
    override fun initialize() { super.initialize(); contextRef = WeakReference(reactApplicationContext) }
    override fun invalidate() { contextRef.clear(); super.invalidate() }

    @ReactMethod fun addListener(eventName: String) = Unit
    @ReactMethod fun removeListeners(count: Double) = Unit

    @ReactMethod
    fun getCapabilities(promise: Promise) {
        val context = reactApplicationContext
        AlarmNotification.createChannel(context)
        val manager = context.getSystemService(NotificationManager::class.java)
        val channelEnabled = Build.VERSION.SDK_INT < 26 ||
            manager.getNotificationChannel(AlarmNotification.CHANNEL_ID).importance >= NotificationManager.IMPORTANCE_HIGH
        promise.resolve(Arguments.createMap().apply {
            putBoolean("available", true)
            putBoolean("exactAlarm", Build.VERSION.SDK_INT < 31 ||
                context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms())
            putBoolean("fullScreen", Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent())
            putBoolean("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled() && channelEnabled)
        })
    }

    @ReactMethod
    fun openPermissionSettings(permission: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = when {
                permission == "exactAlarm" && Build.VERSION.SDK_INT >= 31 ->
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                permission == "fullScreen" && Build.VERSION.SDK_INT >= 34 ->
                    Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                permission == "notifications" && Build.VERSION.SDK_INT >= 26 &&
                    !NotificationManagerCompat.from(context).areNotificationsEnabled() ->
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    }
                permission == "notifications" && Build.VERSION.SDK_INT >= 26 -> Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                    putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    putExtra(Settings.EXTRA_CHANNEL_ID, AlarmNotification.CHANNEL_ID)
                }
                else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            }
            if (intent.action != Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS &&
                intent.action != Settings.ACTION_APP_NOTIFICATION_SETTINGS) {
                intent.data = Uri.parse("package:${context.packageName}")
            }
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(null)
        } catch (error: Exception) { promise.reject("SETTINGS_ERROR", error) }
    }

    @ReactMethod
    fun setExactAlarm(params: ReadableMap, promise: Promise) {
        try {
            val triggerAt = params.getDouble("triggerAtMillis")
            require(triggerAt.isFinite()) { "Invalid trigger date" }
            val data = Bundle().apply {
                putString("id", params.getString("id"))
                putString("label", params.getString("label"))
                putString("time", params.getString("timeStr"))
                putString("spokenText", params.getString("spokenText"))
                putBoolean("vibrate", params.getBoolean("vibrate"))
                val days = params.getArray("repeatDays")
                putIntArray("repeatDays", IntArray(days?.size() ?: 0) { index ->
                    requireNotNull(days).getInt(index).also { require(it in 0..6) }
                })
            }
            AlarmScheduler.schedule(reactApplicationContext, data, triggerAt.toLong())
            promise.resolve(true)
        } catch (error: Exception) { promise.reject("ALARM_ERROR", error) }
    }

    @ReactMethod
    fun cancelAlarm(id: String, promise: Promise) {
        try {
            AlarmScheduler.cancel(reactApplicationContext, id)
            AlarmScheduler.cancel(reactApplicationContext, "${id}_snooze")
            promise.resolve(true)
        } catch (error: Exception) { promise.reject("CANCEL_ERROR", error) }
    }

    @ReactMethod
    fun getActiveAlarm(promise: Promise) {
        promise.resolve(AlarmPlaybackService.activeAlarm?.let { Arguments.fromBundle(it) })
    }

    @ReactMethod
    fun cancelAll(promise: Promise) = onMain(promise) {
        AlarmScheduler.cancelAll(reactApplicationContext)
        AlarmPlaybackService.activeAlarm?.getString("id")?.let(AlarmPlaybackService::stopAlarm)
    }

    @ReactMethod
    fun stopRinging(id: String, promise: Promise) = onMain(promise) { AlarmPlaybackService.stopAlarm(id) }

    @ReactMethod
    fun silence(id: String, promise: Promise) = onMain(promise) { AlarmPlaybackService.silence(id) }

    @ReactMethod
    fun resumeSound(id: String, promise: Promise) = onMain(promise) { AlarmPlaybackService.resumeSound(id) }

    @ReactMethod
    fun snooze(id: String, minutes: Double, promise: Promise) = onMain(promise) {
        require(minutes.isFinite() && minutes > 0) { "Snooze minutes must be positive" }
        AlarmPlaybackService.snooze(id, minutes.toInt())
    }

    private fun onMain(promise: Promise, action: () -> Unit) {
        reactApplicationContext.runOnUiQueueThread {
            try { action(); promise.resolve(null) }
            catch (error: Exception) { promise.reject("ALARM_ACTION_ERROR", error) }
        }
    }
}
