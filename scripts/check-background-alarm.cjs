// Run with: node scripts/check-background-alarm.cjs
// Exercise the real TypeScript scheduler with platform adapters replaced at the boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/domain/services/notification_service.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ permissionError, scheduleError, platform = 'android' } = {}) {
  const calls = { native: [], expo: [], cancelled: [], nativeCancelled: [] };
  const now = new Date(2026, 8, 13, 10, 0, 0).getTime(); // Sunday, local time.
  class Clock extends Date {
    constructor(value) { super(arguments.length ? value : now); }
    static now() { return now; }
  }
  const noop = async () => {};
  const bridge = {
    ensureReady: async () => { if (permissionError) throw permissionError; },
    setExactAlarm: async params => {
      if (scheduleError) throw scheduleError;
      calls.native.push(params);
      return true;
    },
    cancelAlarm: async id => calls.nativeCancelled.push(id),
    cancelAll: noop,
  };
  const notifications = new Proxy({
    setNotificationHandler: () => {},
    AndroidImportance: {}, AndroidNotificationVisibility: {}, AndroidAudioUsage: {},
    AndroidAudioContentType: {}, AndroidNotificationPriority: {},
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'interval', CALENDAR: 'calendar' },
    scheduleNotificationAsync: async params => { calls.expo.push(params); return params.identifier; },
    cancelScheduledNotificationAsync: async id => calls.cancelled.push(id),
  }, { get: (target, key) => target[key] ?? noop });
  const modules = {
    'expo-notifications': notifications,
    'react-native': { Platform: { OS: platform } },
    '@core/utils/native_alarm_bridge': { NativeAlarmBridge: bridge },
    '@shared/stores/useSettingsStore': { useSettingsStore: { getState: () => ({ toneStyle: 'friendly' }) } },
    '@features/ai/response/response_generator': {
      responseGenerator: { generateAlarmAlert: () => ({ title: 'Báo thức', body: 'Đến giờ', spokenText: 'Dậy thôi bạn ơi' }) },
    },
  };
  const sandbox = { exports: {}, Date: Clock, console, require: name => {
    assert.ok(modules[name], `Unexpected dependency: ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(compiled, sandbox, { filename: 'notification_service.js' });
  return { service: sandbox.exports.notificationService, calls, now };
}

async function check(name, run) {
  await run();
  process.stdout.write(`PASS ${name}\n`);
}

(async () => {
  await check('3-second Android test uses one native alarm with speech and no Expo bursts', async () => {
    const { service, calls, now } = fixture();
    await service.triggerTestAlarm(3);
    assert.equal(calls.native.length, 1);
    assert.equal(calls.native[0].triggerDate.getTime(), now + 3000);
    assert.equal(calls.native[0].spokenText, 'Dậy thôi bạn ơi');
    assert.equal(calls.expo.length, 0);
  });
  await check('native scheduling failure rejects instead of reporting a notification as success', async () => {
    const failure = new Error('Native scheduling failed');
    const { service, calls } = fixture({ scheduleError: failure });
    await assert.rejects(service.triggerTestAlarm(3), error => error === failure);
    assert.equal(calls.expo.length, 0);
  });
  await check('missing permission preserves existing schedules', async () => {
    const failure = new Error('Permission missing');
    const { service, calls } = fixture({ permissionError: failure });
    await assert.rejects(service.triggerTestAlarm(3), error => error === failure);
    assert.equal(calls.cancelled.length, 0);
    assert.equal(calls.nativeCancelled.length, 0);
  });
  await check('weekly Monday alarm chooses Monday and resync preserves snoozes', async () => {
    const { service, calls } = fixture();
    await service.scheduleAlarm({ id: 'weekly', label: 'Đi làm', time: '09:00', repeatDays: [0], vibrate: false });
    assert.equal(calls.native[0].triggerDate.getDay(), 1);
    assert.equal(calls.native[0].triggerDate.getDate(), 14);
    assert.equal(calls.native[0].vibrate, false);
    assert.equal(calls.nativeCancelled.length, 0);
    assert.equal(calls.expo.length, 0);
  });
  await check('Sunday is index 6 and a future alarm stays on today', async () => {
    const { service, calls } = fixture();
    await service.scheduleAlarm({ id: 'sunday', time: '11:00', repeatDays: [6] });
    assert.equal(calls.native[0].triggerDate.getDate(), 13);
  });
  await check('invalid countdown and weekday fail without scheduling', async () => {
    const { service, calls } = fixture();
    await assert.rejects(service.triggerTestAlarm(0));
    await assert.rejects(service.triggerTestAlarm(Number.NaN));
    await assert.rejects(service.scheduleAlarm({ id: 'bad', time: '09:00', repeatDays: [7] }));
    assert.equal(calls.native.length, 0);
    assert.equal(calls.expo.length, 0);
  });
  await check('cancelling one alarm does not cancel unrelated test notifications', async () => {
    const { service, calls } = fixture();
    await service.cancel('personal');
    assert.deepEqual(calls.nativeCancelled, ['personal']);
    assert.ok(calls.cancelled.every(id => id === 'personal' || id.startsWith('personal_burst_')));
  });
  await check('iOS test still schedules Expo notifications', async () => {
    const { service, calls } = fixture({ platform: 'ios' });
    await service.triggerTestAlarm(3);
    assert.equal(calls.native.length, 0);
    assert.equal(calls.expo.length, 3);
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
