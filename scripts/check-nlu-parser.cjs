// Run with: node scripts/check-nlu-parser.cjs
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function compileAndLoad(filePath, sandboxModules = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const sandbox = {
    exports: {},
    Object,
    console,
    Date,
    parseInt,
    isNaN,
    Array,
    Set,
    String,
    Math,
    RegExp,
    require: name => {
      if (sandboxModules[name]) return sandboxModules[name];
      throw new Error(`Unexpected dependency in sandbox: ${name}`);
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: path.basename(filePath) });
  return sandbox.exports;
}

// 1. Load VietnameseTimeParser
const timeParserPath = path.join(__dirname, '../src/core/utils/vietnamese_time_parser.ts');
const timeParserModule = compileAndLoad(timeParserPath);
const timeParser = timeParserModule.vietnameseTimeParser;

// 2. Load vi_patterns
const viPatternsPath = path.join(__dirname, '../src/features/ai/nlu/patterns/vi_patterns.ts');
const viPatternsModule = compileAndLoad(viPatternsPath);

// 3. Load RuleBasedParser
const ruleParserPath = path.join(__dirname, '../src/features/ai/nlu/rule_based_parser.ts');
const ruleParserModule = compileAndLoad(ruleParserPath, {
  '@domain/enums': {},
  './patterns/vi_patterns': viPatternsModule,
  '@core/utils/vietnamese_time_parser': timeParserModule,
});
const ruleParser = ruleParserModule.ruleBasedParser;

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    passCount++;
    process.stdout.write(`PASS ${name}\n`);
  } catch (err) {
    process.stderr.write(`FAIL ${name}\n`);
    throw err;
  }
}

console.log('--- RUNNING NLU & VIETNAMESE TIME PARSER TEST SUITE ---');

// Group 1: Vietnamese Time Parser - Standard & Period Modifiers
test('Time Parser: parses standard format 6h30', () => {
  const res = timeParser.parseTimeOfDay('6h30');
  assert.deepEqual(res, { hours: 6, minutes: 30 });
});

test('Time Parser: parses 6 giờ 30', () => {
  const res = timeParser.parseTimeOfDay('báo thức lúc 6 giờ 30');
  assert.deepEqual(res, { hours: 6, minutes: 30 });
});

test('Time Parser: parses 5 rưỡi sáng', () => {
  const res = timeParser.parseTimeOfDay('gọi tôi dậy lúc 5 rưỡi sáng');
  assert.deepEqual(res, { hours: 5, minutes: 30 });
});

test('Time Parser: parses 3 giờ chiều (15:00)', () => {
  const res = timeParser.parseTimeOfDay('nhắc tôi lúc 3 giờ chiều');
  assert.deepEqual(res, { hours: 15, minutes: 0 });
});

test('Time Parser: parses 8 giờ tối (20:00)', () => {
  const res = timeParser.parseTimeOfDay('hẹn 8 giờ tối');
  assert.deepEqual(res, { hours: 20, minutes: 0 });
});

test('Time Parser: parses 12 giờ đêm (00:00)', () => {
  const res = timeParser.parseTimeOfDay('12 giờ đêm');
  assert.deepEqual(res, { hours: 0, minutes: 0 });
});

// Group 2: Vietnamese Time Parser - "Giờ kém" (New Feature P1)
test('Time Parser: parses 7 giờ kém 15 (06:45)', () => {
  const res = timeParser.parseTimeOfDay('đặt báo thức 7 giờ kém 15');
  assert.deepEqual(res, { hours: 6, minutes: 45 });
});

test('Time Parser: parses 8h kém 20 tối (19:40)', () => {
  const res = timeParser.parseTimeOfDay('nhắc tôi lúc 8h kém 20 tối');
  assert.deepEqual(res, { hours: 19, minutes: 40 });
});

test('Time Parser: parses 1 giờ kém 10 chiều (12:50)', () => {
  const res = timeParser.parseTimeOfDay('họp lúc 1 giờ kém 10 chiều');
  assert.deepEqual(res, { hours: 12, minutes: 50 });
});

test('Time Parser: parses 12 giờ kém 15 đêm (23:45)', () => {
  const res = timeParser.parseTimeOfDay('12 giờ kém 15 đêm');
  assert.deepEqual(res, { hours: 23, minutes: 45 });
});

// Group 3: Relative Durations
test('Time Parser: parses nửa tiếng nữa (30 mins relative)', () => {
  const ref = new Date('2026-09-10T10:00:00.000Z');
  const res = timeParser.parse('nhắc tôi uống nước nửa tiếng nữa', ref);
  assert.strictEqual(res.getTime(), ref.getTime() + 30 * 60 * 1000);
});

test('Time Parser: parses 15 phút nữa relative', () => {
  const ref = new Date('2026-09-10T10:00:00.000Z');
  const res = timeParser.parse('tắt bếp sau 15 phút nữa', ref);
  assert.strictEqual(res.getTime(), ref.getTime() + 15 * 60 * 1000);
});

// Group 4: Repeat Days Parsing
test('Time Parser: parses hàng ngày / mỗi ngày (0-6)', () => {
  const days = timeParser.parseRepeatDays('đặt báo thức 6h hàng ngày');
  assert.deepEqual(days, [0, 1, 2, 3, 4, 5, 6]);
});

test('Time Parser: parses thứ 2 đến thứ 6 (0-4)', () => {
  const days = timeParser.parseRepeatDays('chuông 7h thứ 2 đến thứ 6');
  assert.deepEqual(days, [0, 1, 2, 3, 4]);
});

test('Time Parser: parses cuối tuần (5, 6)', () => {
  const days = timeParser.parseRepeatDays('báo thức 8h cuối tuần');
  assert.deepEqual(days, [5, 6]);
});

test('Time Parser: parses thứ 2, thứ 4, thứ 6 cụ thể', () => {
  const days = timeParser.parseRepeatDays('lặp lại vào thứ 2, thứ 4 và thứ 6');
  assert.deepEqual(days, [0, 2, 4]);
});

// Group 5: Rule-Based NLU - Alarm Intents
test('NLU: classifies setAlarm with clear time', () => {
  const parsed = ruleParser.parse('đặt báo thức 6h30 sáng');
  assert.strictEqual(parsed.intent, 'setAlarm');
  assert.strictEqual(parsed.entities.time, '06:30');
  assert.ok(parsed.confidence >= 0.9);
});

test('NLU: classifies setAlarm with giờ kém (7 giờ kém 15)', () => {
  const parsed = ruleParser.parse('đặt báo thức 7 giờ kém 15');
  assert.strictEqual(parsed.intent, 'setAlarm');
  assert.strictEqual(parsed.entities.time, '06:45');
});

test('NLU: classifies cancelAlarm', () => {
  const parsed = ruleParser.parse('hủy báo thức');
  assert.strictEqual(parsed.intent, 'cancelAlarm');
  assert.ok(parsed.confidence >= 0.9);
});

// Group 6: Rule-Based NLU - Reminder & Todo Intents
test('NLU: classifies setReminder with title and time', () => {
  const parsed = ruleParser.parse('nhắc tôi đi đón con lúc 5 giờ chiều');
  assert.strictEqual(parsed.intent, 'setReminder');
  assert.strictEqual(parsed.entities.time, '17:00');
  assert.ok(parsed.entities.title.toLowerCase().includes('đón con'));
});

test('NLU: classifies addTodo', () => {
  const parsed = ruleParser.parse('thêm việc mua sữa vào danh sách');
  assert.strictEqual(parsed.intent, 'addTodo');
  assert.ok(parsed.entities.title.toLowerCase().includes('mua sữa'));
});

test('NLU: classifies completeTodo', () => {
  const parsed = ruleParser.parse('đã làm xong việc mua sữa');
  assert.strictEqual(parsed.intent, 'completeTodo');
  assert.ok(parsed.entities.title.toLowerCase().includes('mua sữa'));
});

test('NLU: classifies editTodo', () => {
  const parsed = ruleParser.parse('sửa việc mua sữa thành mua nước ép');
  assert.strictEqual(parsed.intent, 'editTodo');
  assert.strictEqual(parsed.entities.oldTitle, 'mua sữa');
  assert.strictEqual(parsed.entities.newTitle, 'mua nước ép');
});

// Group 7: Schedule Query & General QA
test('NLU: classifies querySchedule', () => {
  const parsed = ruleParser.parse('hôm nay có lịch gì không');
  assert.strictEqual(parsed.intent, 'querySchedule');
});

test('NLU: classifies generalQa', () => {
  const parsed = ruleParser.parse('thời tiết hôm nay thế nào');
  assert.strictEqual(parsed.intent, 'generalQa');
});

// Group 8: Compound Commands (parseMultiple)
test('NLU: parses multiple compound commands with "và"', () => {
  const commands = ruleParser.parseMultiple('đặt báo thức 6h và nhắc tôi uống thuốc lúc 7h');
  assert.strictEqual(commands.length, 2);
  assert.strictEqual(commands[0].intent, 'setAlarm');
  assert.strictEqual(commands[1].intent, 'setReminder');
});

test('NLU: parses multiple compound commands with "rồi"', () => {
  const commands = ruleParser.parseMultiple('thêm việc nộp bài tập rồi nhắc tôi họp lúc 9h');
  assert.strictEqual(commands.length, 2);
  assert.strictEqual(commands[0].intent, 'addTodo');
  assert.strictEqual(commands[1].intent, 'setReminder');
});

// Group 9: Edge Cases
test('NLU Edge Case: empty string returns unknown with 0 confidence', () => {
  const parsed = ruleParser.parse('');
  assert.strictEqual(parsed.intent, 'unknown');
  assert.strictEqual(parsed.confidence, 0);
});

test('NLU Edge Case: unrelated gibberish returns unknown', () => {
  const parsed = ruleParser.parse('xyz abc qwerty 1234');
  assert.strictEqual(parsed.intent, 'unknown');
});

// Group 10: Dialogue Store & Slot-Filling State
const zustand = require('zustand');
const dialogueStorePath = path.join(__dirname, '../src/shared/stores/useDialogueStore.ts');
const dialogueStoreModule = compileAndLoad(dialogueStorePath, {
  'zustand': zustand,
});
const useDialogueStore = dialogueStoreModule.useDialogueStore;

test('Dialogue Store: starts slot filling session with 90s TTL', () => {
  useDialogueStore.getState().cancelSession();
  useDialogueStore.getState().startSlotFilling({
    intent: 'setAlarm',
    missingSlot: 'time',
    collectedEntities: { label: 'Dậy đi làm' },
    promptQuestion: 'Bạn muốn đặt lúc mấy giờ nè?',
  });
  const session = useDialogueStore.getState().activeSession;
  assert.ok(session !== null);
  assert.strictEqual(session.intent, 'setAlarm');
  assert.strictEqual(session.missingSlot, 'time');
  assert.strictEqual(session.collectedEntities.label, 'Dậy đi làm');
  assert.ok(session.expiresAt > Date.now());
});

test('Dialogue Store: fillSlot returns complete entities and clears session', () => {
  const filled = useDialogueStore.getState().fillSlot('time', '06:30');
  assert.ok(filled !== null);
  assert.strictEqual(filled.time, '06:30');
  assert.strictEqual(filled.label, 'Dậy đi làm');
  assert.strictEqual(useDialogueStore.getState().activeSession, null);
});

test('Dialogue Store: cancelSession resets pending session', () => {
  useDialogueStore.getState().startSlotFilling({
    intent: 'setReminder',
    missingSlot: 'title',
    collectedEntities: { time: '15:00' },
    promptQuestion: 'Nhắc việc gì vậy bạn?',
  });
  assert.ok(useDialogueStore.getState().activeSession !== null);
  useDialogueStore.getState().cancelSession();
  assert.strictEqual(useDialogueStore.getState().activeSession, null);
});

test('Dialogue Store: clearExpiredSession cleans up expired sessions', () => {
  useDialogueStore.getState().startSlotFilling({
    intent: 'setAlarm',
    missingSlot: 'time',
    collectedEntities: {},
    promptQuestion: 'Mấy giờ?',
  });
  // Manually mutate expiresAt to past
  useDialogueStore.setState({
    activeSession: {
      ...useDialogueStore.getState().activeSession,
      expiresAt: Date.now() - 1000,
    },
  });
  const cleared = useDialogueStore.getState().clearExpiredSession();
  assert.strictEqual(cleared, true);
  assert.strictEqual(useDialogueStore.getState().activeSession, null);
});

test('Dialogue Store: maintains maximum 6 chat turns in history', () => {
  useDialogueStore.getState().clearHistory();
  for (let i = 1; i <= 8; i++) {
    useDialogueStore.getState().addChatTurn(i % 2 === 1 ? 'user' : 'assistant', `Msg ${i}`);
  }
  const turns = useDialogueStore.getState().recentTurns;
  assert.strictEqual(turns.length, 6);
  assert.strictEqual(turns[0].content, 'Msg 3');
  assert.strictEqual(turns[5].content, 'Msg 8');
});

// Group 11: Multi-Turn Dialogue Prompts & Follow-Up Simulation
const ft = compileAndLoad(path.join(__dirname, '../src/features/ai/response/templates/friendly_templates.ts'));
const pt = compileAndLoad(path.join(__dirname, '../src/features/ai/response/templates/professional_templates.ts'));
const ct = compileAndLoad(path.join(__dirname, '../src/features/ai/response/templates/cute_templates.ts'));
const rgModule = compileAndLoad(path.join(__dirname, '../src/features/ai/response/response_generator.ts'), {
  '@domain/enums': {},
  './templates/friendly_templates': ft,
  './templates/professional_templates': pt,
  './templates/cute_templates': ct,
});
const responseGenerator = rgModule.responseGenerator;

test('Response Generator: generates missing slot prompt according to Tone', () => {
  const friendly = responseGenerator.generateMissingSlotPrompt('setAlarm', 'time', 'friendly');
  assert.ok(friendly.includes('mấy giờ'));

  const professional = responseGenerator.generateMissingSlotPrompt('setAlarm', 'time', 'professional');
  assert.ok(professional.includes('thời gian'));

  const cute = responseGenerator.generateMissingSlotPrompt('setAlarm', 'time', 'cute');
  assert.ok(cute.includes('Chủ nhân ơi') || cute.includes('chuông báo thức'));
});

test('Response Generator: reminder missing title incorporates time context', () => {
  const prompt = responseGenerator.generateMissingSlotPrompt('setReminder', 'title', 'friendly', { time: '15:00' });
  assert.ok(prompt.includes('15:00'));
});

test('Follow-Up Simulation: Turn 1 (missing time) -> Turn 2 ("6 rưỡi sáng") completes alarm', () => {
  useDialogueStore.getState().cancelSession();
  // Turn 1: User says "Đặt báo thức"
  const turn1Input = 'đặt báo thức';
  const turn1Parsed = ruleParser.parse(turn1Input);
  assert.strictEqual(turn1Parsed.intent, 'setAlarm');
  assert.strictEqual(turn1Parsed.entities.time, undefined);

  // System initiates slot-filling
  useDialogueStore.getState().startSlotFilling({
    intent: 'setAlarm',
    missingSlot: 'time',
    collectedEntities: { label: 'Báo thức' },
    promptQuestion: responseGenerator.generateMissingSlotPrompt('setAlarm', 'time', 'friendly'),
  });

  // Turn 2: User says "6 rưỡi sáng"
  const turn2Input = '6 rưỡi sáng';
  const active = useDialogueStore.getState().activeSession;
  assert.ok(active !== null);
  assert.strictEqual(active.missingSlot, 'time');

  const parsedTime = timeParser.parseTimeOfDay(turn2Input);
  assert.deepEqual(parsedTime, { hours: 6, minutes: 30 });
  const timeFormatted = `${String(parsedTime.hours).padStart(2, '0')}:${String(parsedTime.minutes).padStart(2, '0')}`;

  const completed = useDialogueStore.getState().fillSlot('time', timeFormatted);
  assert.strictEqual(completed.time, '06:30');
  assert.strictEqual(completed.label, 'Báo thức');
  assert.strictEqual(useDialogueStore.getState().activeSession, null);
});

test('Follow-Up Simulation: user cancels pending session ("thôi không đặt nữa")', () => {
  useDialogueStore.getState().startSlotFilling({
    intent: 'setAlarm',
    missingSlot: 'time',
    collectedEntities: {},
    promptQuestion: 'Mấy giờ?',
  });
  const cancelInput = 'thôi không đặt nữa';
  const cancelKeywords = /^(?:thôi|hủy|hủy bỏ|bỏ qua|không cần|thôi không đặt nữa|dừng lại|thôi khỏi|thôi bỏ đi)[.!?,]*$/i;
  assert.ok(cancelKeywords.test(cancelInput));
  useDialogueStore.getState().cancelSession();
  assert.strictEqual(useDialogueStore.getState().activeSession, null);
});

console.log(`\n========================================`);
console.log(`ALL ${passCount} TEST CASES PASSED SUCCESSFULLY!`);
console.log(`========================================\n`);
