const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidManifest, withMainApplication, withMainActivity, withDangerousMod } = require('expo/config-plugins');

function removeMethod(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) return source;
  const body = source.indexOf('{', start);
  let depth = 1;
  let end = body + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  return source.slice(0, start) + source.slice(end);
}

module.exports = function withAndroidAlarm(config) {
  config = withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    const permissions = ['SCHEDULE_EXACT_ALARM', 'USE_FULL_SCREEN_INTENT', 'POST_NOTIFICATIONS',
      'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'WAKE_LOCK', 'VIBRATE'];
    manifest['uses-permission'] ??= [];
    for (const permission of permissions) {
      const name = `android.permission.${permission}`;
      if (!manifest['uses-permission'].some(item => item.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    manifest.queries ??= [{}];
    manifest.queries[0].intent ??= [];
    if (!manifest.queries[0].intent.some(item =>
      item.action?.some(action => action.$['android:name'] === 'android.intent.action.TTS_SERVICE'))) {
      manifest.queries[0].intent.push({ action: [{ $: { 'android:name': 'android.intent.action.TTS_SERVICE' } }] });
    }
    const app = manifest.application[0];
    app.receiver = (app.receiver ?? []).filter(item => item.$['android:name'] !== '.AlarmReceiver');
    app.receiver.push({ $: { 'android:name': '.AlarmReceiver', 'android:exported': 'false' } });
    app.service = (app.service ?? []).filter(item => item.$['android:name'] !== '.AlarmPlaybackService');
    app.service.push({ $: { 'android:name': '.AlarmPlaybackService', 'android:exported': 'false',
      'android:foregroundServiceType': 'mediaPlayback', 'android:stopWithTask': 'false' } });
    const main = app.activity.find(item => item.$['android:name'] === '.MainActivity');
    if (main) {
      delete main.$['android:showWhenLocked'];
      delete main.$['android:turnScreenOn'];
      delete main.$['android:showForAllUsers'];
    }
    return mod;
  });
  config = withMainApplication(config, mod => {
    if (!mod.modResults.contents.includes('add(AndroidAlarmPackage())')) {
      const marker = 'PackageList(this).packages.apply {';
      if (!mod.modResults.contents.includes(marker)) throw new Error('Cannot register AndroidAlarmPackage');
      mod.modResults.contents = mod.modResults.contents.replace(marker, `${marker}\n          add(AndroidAlarmPackage())`);
    }
    return mod;
  });
  config = withMainActivity(config, mod => {
    let source = removeMethod(mod.modResults.contents, 'private fun turnScreenOnAndKeyguard()');
    source = source.replaceAll('turnScreenOnAndKeyguard()', 'AlarmWindow.configure(this)');
    if (!source.includes('AlarmWindow.configure(this)')) {
      source = source.replace('super.onCreate(null)', 'super.onCreate(null)\n    AlarmWindow.configure(this)');
    }
    if (!source.includes('override fun onNewIntent(')) {
      source = source.replace('class MainActivity : ReactActivity() {',
        `class MainActivity : ReactActivity() {\n  override fun onNewIntent(intent: android.content.Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)\n    AlarmWindow.configure(this)\n  }\n`);
    }
    mod.modResults.contents = source;
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    // RN 0.86.3 ships AGP 8.12 / Kotlin 2.1; its settings plugin fails on Gradle 9.3.1.
    const wrapper = path.join(mod.modRequest.platformProjectRoot, 'gradle/wrapper/gradle-wrapper.properties');
    const wrapperContents = await fs.readFile(wrapper, 'utf8');
    await fs.writeFile(wrapper, wrapperContents.replace('gradle-9.3.1-bin.zip', 'gradle-8.14.3-bin.zip'));
    const source = path.join(__dirname, 'android-alarm');
    const target = path.join(mod.modRequest.platformProjectRoot, 'app/src/main');
    const javaDir = path.join(target, 'java/com/voiceassist/ai');
    await fs.mkdir(javaDir, { recursive: true });
    for (const file of await fs.readdir(source)) {
      if (file.endsWith('.kt')) await fs.copyFile(path.join(source, file), path.join(javaDir, file));
    }
    await fs.mkdir(path.join(target, 'res/drawable'), { recursive: true });
    await fs.copyFile(path.join(source, 'alarm_notification.xml'), path.join(target, 'res/drawable/alarm_notification.xml'));
    return mod;
  }]);
};
