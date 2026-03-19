import { describe, it, expect, beforeEach } from 'vitest';
import { MidiCaptureBuffer } from '../../src/utils/midiCaptureBuffer';

describe('MidiCaptureBuffer', () => {
  let buffer: MidiCaptureBuffer;

  beforeEach(() => {
    buffer = new MidiCaptureBuffer({ maxDurationSeconds: 30, maxEvents: 1000 });
  });

  it('starts empty', () => {
    expect(buffer.getEvents()).toEqual([]);
    expect(buffer.getEventCount()).toBe(0);
  });

  it('records note-on and note-off as a single event with duration', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOff(60, 1.5);
    const events = buffer.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      pitch: 60,
      velocity: 0.8,
      timestamp: 1.0,
      duration: 0.5,
    });
  });

  it('handles multiple simultaneous notes', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOn(64, 0.7, 1.0);
    buffer.noteOff(60, 1.5);
    buffer.noteOff(64, 2.0);
    const events = buffer.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].pitch).toBe(60);
    expect(events[0].duration).toBe(0.5);
    expect(events[1].pitch).toBe(64);
    expect(events[1].duration).toBe(1.0);
  });

  it('evicts events older than maxDurationSeconds', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOff(60, 1.5);
    // Add a note 31s later — should evict the first
    buffer.noteOn(64, 0.7, 32.0);
    buffer.noteOff(64, 32.5);
    const events = buffer.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].pitch).toBe(64);
  });

  it('evicts oldest events when maxEvents is exceeded', () => {
    const small = new MidiCaptureBuffer({ maxDurationSeconds: 60, maxEvents: 2 });
    small.noteOn(60, 0.8, 1.0);
    small.noteOff(60, 1.5);
    small.noteOn(62, 0.8, 2.0);
    small.noteOff(62, 2.5);
    small.noteOn(64, 0.8, 3.0);
    small.noteOff(64, 3.5);
    const events = small.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].pitch).toBe(62);
    expect(events[1].pitch).toBe(64);
  });

  it('capture() returns events within the given time window', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOff(60, 1.5);
    buffer.noteOn(62, 0.7, 3.0);
    buffer.noteOff(62, 3.5);
    buffer.noteOn(64, 0.9, 5.0);
    buffer.noteOff(64, 5.5);

    const captured = buffer.capture(2.0, 4.0);
    expect(captured).toHaveLength(1);
    expect(captured[0].pitch).toBe(62);
  });

  it('capture() with no args returns all completed events', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOff(60, 1.5);
    buffer.noteOn(62, 0.7, 2.0);
    buffer.noteOff(62, 2.5);
    const captured = buffer.capture();
    expect(captured).toHaveLength(2);
  });

  it('capture() normalizes timestamps to start at 0', () => {
    buffer.noteOn(60, 0.8, 10.0);
    buffer.noteOff(60, 10.5);
    buffer.noteOn(62, 0.7, 12.0);
    buffer.noteOff(62, 12.5);
    const captured = buffer.capture(9.0, 13.0);
    expect(captured[0].timestamp).toBe(0);
    expect(captured[1].timestamp).toBeCloseTo(2.0);
  });

  it('clear() removes all events and pending notes', () => {
    buffer.noteOn(60, 0.8, 1.0);
    buffer.noteOff(60, 1.5);
    buffer.noteOn(62, 0.7, 2.0); // pending, no noteOff yet
    buffer.clear();
    expect(buffer.getEvents()).toEqual([]);
    expect(buffer.getEventCount()).toBe(0);
  });

  it('ignores noteOff for notes that were never started', () => {
    buffer.noteOff(60, 1.5);
    expect(buffer.getEvents()).toEqual([]);
  });

  it('handles repeated noteOn for same pitch (retrigger)', () => {
    buffer.noteOn(60, 0.8, 1.0);
    // Retrigger same note before noteOff — first note gets auto-closed
    buffer.noteOn(60, 0.9, 2.0);
    buffer.noteOff(60, 2.5);
    const events = buffer.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].duration).toBe(1.0); // auto-closed at retrigger time
    expect(events[1].velocity).toBe(0.9);
    expect(events[1].duration).toBe(0.5);
  });
});
