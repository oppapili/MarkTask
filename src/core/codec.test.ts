import { describe, test, expect } from 'bun:test';
import { decode, encode, titleFromRef } from './codec.js';

describe('titleFromRef', () => {
  test('strips date prefix and converts hyphens to spaces', () => {
    expect(titleFromRef('20260712-buy-milk')).toBe('buy milk');
  });

  test('handles ref without date prefix', () => {
    expect(titleFromRef('some-task')).toBe('some task');
  });

  test('handles Japanese characters', () => {
    expect(titleFromRef('20260712-買い物リスト')).toBe('買い物リスト');
  });
});

describe('decode', () => {
  test('decodes valid frontmatter + body', () => {
    const content = `---
type: task
status: todo
priority: high
tags:
  - work
  - urgent
created: "2026-07-12T10:00:00Z"
updated: "2026-07-12T10:00:00Z"
---
# My Task

Some content here.`;

    const task = decode(content, '20260712-my-task');
    expect(task.ref).toBe('20260712-my-task');
    expect(task.title).toBe('my task');
    expect(task.type).toBe('task');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('high');
    expect(task.tags).toEqual(['work', 'urgent']);
    expect(task.body).toBe('# My Task\n\nSome content here.');
    expect(task.created).toBe('2026-07-12T10:00:00Z');
  });

  test('handles missing frontmatter gracefully (SEC-6, NFR-2)', () => {
    const content = '# Just a markdown file\n\nNo frontmatter here.';
    const task = decode(content, '20260712-plain-note');
    expect(task.ref).toBe('20260712-plain-note');
    expect(task.type).toBe('task'); // default
    expect(task.status).toBe('todo'); // default
    expect(task.priority).toBe('medium'); // default
    expect(task.tags).toEqual([]);
    expect(task.body).toBe('# Just a markdown file\n\nNo frontmatter here.');
  });

  test('preserves unknown frontmatter fields in raw (INV2)', () => {
    const content = `---
type: task
status: done
custom_field: hello
another_unknown: 42
---
Body text.`;

    const task = decode(content, '20260712-custom');
    expect(task.raw['custom_field']).toBe('hello');
    expect(task.raw['another_unknown']).toBe(42);
    // Known fields should NOT be in raw
    expect(task.raw['type']).toBeUndefined();
    expect(task.raw['status']).toBeUndefined();
  });

  test('handles empty string content', () => {
    const task = decode('', '20260712-empty');
    expect(task.ref).toBe('20260712-empty');
    expect(task.body).toBe('');
    expect(task.type).toBe('task');
  });

  test('handles frontmatter-only (no body)', () => {
    const content = `---
type: recurrence
status: waiting
repeat: every 3 days
---`;

    const task = decode(content, '20260712-recurring');
    expect(task.type).toBe('recurrence');
    expect(task.status).toBe('waiting');
    expect(task.repeat).toBe('every 3 days');
    expect(task.body).toBe('');
  });
});

describe('encode', () => {
  test('encodes task back to frontmatter + body', () => {
    const task = decode(
      `---
type: task
status: in-progress
priority: low
created: "2026-07-12T10:00:00Z"
updated: "2026-07-12T11:00:00Z"
---
Task body here.`,
      '20260712-encode-test',
    );

    const output = encode(task);
    expect(output).toContain('type: task');
    expect(output).toContain('status: in-progress');
    expect(output).toContain('priority: low');
    expect(output).toContain('Task body here.');
  });

  test('preserves unknown fields through encode round-trip (INV2)', () => {
    const original = `---
type: task
status: todo
custom_field: preserved
nested:
  key: value
---
Content.`;

    const task = decode(original, '20260712-roundtrip');
    const encoded = encode(task);

    // Re-decode to verify preservation
    const task2 = decode(encoded, '20260712-roundtrip');
    expect(task2.raw['custom_field']).toBe('preserved');
    expect((task2.raw['nested'] as Record<string, unknown>)?.['key']).toBe('value');
    expect(task2.status).toBe('todo');
    expect(task2.body).toContain('Content.');
  });

  test('encode with empty body produces valid frontmatter', () => {
    const task = decode(
      `---
type: task
status: todo
---`,
      '20260712-no-body',
    );

    const output = encode(task);
    expect(output).toContain('type: task');
    expect(output).toContain('status: todo');
  });
});
