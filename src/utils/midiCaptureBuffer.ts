import type { BufferedMidiEvent } from '../types/session';

export interface MidiCaptureBufferOptions {
  /** Maximum age (seconds) of events to keep in the buffer. */
  maxDurationSeconds: number;
  /** Maximum number of completed events to keep. */
  maxEvents: number;
}

/**
 * Always-on circular buffer that records MIDI note events for retroactive capture.
 * Events older than `maxDurationSeconds` or exceeding `maxEvents` are evicted.
 */
export class MidiCaptureBuffer {
  private events: BufferedMidiEvent[] = [];
  /** Pending note-ons that haven't received a note-off yet, keyed by pitch. */
  private pending = new Map<number, { velocity: number; timestamp: number }>();
  private readonly maxDuration: number;
  private readonly maxEvents: number;

  constructor(options: MidiCaptureBufferOptions) {
    this.maxDuration = options.maxDurationSeconds;
    this.maxEvents = options.maxEvents;
  }

  /** Record a note-on event. */
  noteOn(pitch: number, velocity: number, timestamp: number): void {
    // If the same pitch is already pending, auto-close it (retrigger)
    const existing = this.pending.get(pitch);
    if (existing) {
      this.events.push({
        pitch,
        velocity: existing.velocity,
        timestamp: existing.timestamp,
        duration: timestamp - existing.timestamp,
      });
    }
    this.pending.set(pitch, { velocity, timestamp });
    this.evict(timestamp);
  }

  /** Record a note-off event, completing the corresponding note-on. */
  noteOff(pitch: number, timestamp: number): void {
    const note = this.pending.get(pitch);
    if (!note) return;
    this.pending.delete(pitch);
    this.events.push({
      pitch,
      velocity: note.velocity,
      timestamp: note.timestamp,
      duration: timestamp - note.timestamp,
    });
    this.evict(timestamp);
  }

  /** Get all completed events currently in the buffer (read-only copies). */
  getEvents(): BufferedMidiEvent[] {
    return this.events.map((e) => ({ ...e }));
  }

  /** Number of completed events in the buffer. */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Capture events within an optional time window.
   * Returns copies with timestamps normalized to start at 0.
   * If no window specified, captures all completed events.
   */
  capture(startTime?: number, endTime?: number): BufferedMidiEvent[] {
    let filtered = this.events;
    if (startTime !== undefined && endTime !== undefined) {
      filtered = this.events.filter(
        (e) => e.timestamp >= startTime && e.timestamp + e.duration <= endTime,
      );
    }
    if (filtered.length === 0) return [];
    const earliest = filtered[0].timestamp;
    return filtered.map((e) => ({
      ...e,
      timestamp: e.timestamp - earliest,
    }));
  }

  /** Remove all events and pending notes. */
  clear(): void {
    this.events = [];
    this.pending.clear();
  }

  /** Evict events that are too old or exceed maxEvents. */
  private evict(currentTime: number): void {
    const cutoff = currentTime - this.maxDuration;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }
}
