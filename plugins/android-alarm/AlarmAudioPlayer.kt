package com.voiceassist.ai

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

class AlarmAudioPlayer(private val context: Context) {
    private val handler = Handler(Looper.getMainLooper())
    private val attributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
    private val audioManager = context.getSystemService(AudioManager::class.java)
    private val vibrator = context.getSystemService(Vibrator::class.java)
    private var tts: TextToSpeech? = null
    private var ringtone: Ringtone? = null
    private var focus: AudioFocusRequest? = null
    private var stopped = false
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS) stop()
    }

    fun start(text: String, vibrate: Boolean) {
        if (Build.VERSION.SDK_INT >= 26) {
            focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attributes).setOnAudioFocusChangeListener(focusListener).build()
            audioManager.requestAudioFocus(requireNotNull(focus))
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_ALARM,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }
        if (vibrate) {
            val pattern = longArrayOf(0, 400, 600, 400, 600, 800, 400, 800)
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            else { @Suppress("DEPRECATION") vibrator.vibrate(pattern, 0) }
        }
        // Ring immediately, including while the speech engine is starting or unavailable.
        startFallback()
        tts = TextToSpeech(context) { status ->
            handler.post {
                if (!stopped) initializeSpeech(status, text)
            }
        }
    }

    private fun initializeSpeech(status: Int, text: String) {
        val engine = tts ?: return
        if (status != TextToSpeech.SUCCESS || engine.setLanguage(Locale.forLanguageTag("vi-VN")) < 0) {
            Log.w("VoiceAssistAlarm", "Vietnamese TTS unavailable; using alarm ringtone")
            return
        }
        val offlineVoice = engine.voices?.firstOrNull {
            it.locale.language == "vi" && !it.isNetworkConnectionRequired
        }
        if (offlineVoice == null) {
            Log.w("VoiceAssistAlarm", "Offline Vietnamese voice unavailable; using alarm ringtone")
            return
        }
        engine.voice = offlineVoice
        engine.setAudioAttributes(attributes)
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                Log.i("VoiceAssistAlarm", "Vietnamese alarm speech started")
                handler.post { if (!stopped) ringtone?.stop() }
            }
            override fun onDone(id: String?) {
                Log.i("VoiceAssistAlarm", "Vietnamese alarm speech completed")
                handler.postDelayed({ if (!stopped) speak(text) }, 3500)
            }
            @Deprecated("Deprecated in Java")
            override fun onError(id: String?) {
                handler.post { if (!stopped) startFallback() }
            }
        })
        speak(text)
    }

    private fun speak(text: String) {
        if (tts?.speak(text.take(TextToSpeech.getMaxSpeechInputLength()),
                TextToSpeech.QUEUE_FLUSH, null, "alarm") == TextToSpeech.ERROR) startFallback()
    }

    private fun startFallback() {
        if (stopped) return
        try {
            if (ringtone == null) {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ringtone = RingtoneManager.getRingtone(context, uri)?.apply {
                    audioAttributes = attributes
                    if (Build.VERSION.SDK_INT >= 28) isLooping = true
                }
            }
            if (ringtone?.isPlaying == false) ringtone?.play()
        } catch (error: Exception) {
            Log.e("VoiceAssistAlarm", "Could not play fallback ringtone", error)
        }
    }

    fun stop() {
        stopped = true
        handler.removeCallbacksAndMessages(null)
        tts?.stop()
        tts?.shutdown()
        tts = null
        ringtone?.stop()
        ringtone = null
        vibrator.cancel()
        if (Build.VERSION.SDK_INT >= 26) focus?.let { audioManager.abandonAudioFocusRequest(it) }
        else { @Suppress("DEPRECATION") audioManager.abandonAudioFocus(focusListener) }
    }
}
