import { describe, expect, it } from 'vitest';
import { inferModelCategory } from '../aceStepApi';

describe('inferModelCategory', () => {
  it('uses explicit category when provided', () => {
    expect(inferModelCategory({ category: 'lego', supported_task_types: ['text2music'] })).toBe('lego');
    expect(inferModelCategory({ category: 'text2music' })).toBe('text2music');
  });

  it('infers text2music from supported_task_types', () => {
    expect(inferModelCategory({ supported_task_types: ['text2music', 'cover', 'repaint'] })).toBe('text2music');
  });

  it('infers lego from supported_task_types', () => {
    expect(inferModelCategory({ supported_task_types: ['lego', 'cover', 'repaint'] })).toBe('lego');
  });

  it('infers lego from model name containing "lego"', () => {
    expect(inferModelCategory({ name: 'ace-step-lego-v1' })).toBe('lego');
    expect(inferModelCategory({ name: 'ACE-LEGO-turbo' })).toBe('lego');
  });

  it('defaults to text2music when no signals available', () => {
    expect(inferModelCategory({})).toBe('text2music');
    expect(inferModelCategory({ name: 'mystery-model' })).toBe('text2music');
  });

  it('prioritizes name heuristic over ambiguous supported_task_types', () => {
    // When supported_task_types contains both text2music and lego,
    // the name is the only reliable signal (base models all return both)
    expect(inferModelCategory({
      name: 'lego-model',
      supported_task_types: ['text2music', 'cover'],
    })).toBe('lego');
  });

  it('classifies lego model correctly when task_types contain both text2music and lego', () => {
    expect(inferModelCategory({
      name: 'acestep-v15-lego-cover-repaint',
      supported_task_types: ['text2music', 'repaint', 'cover', 'extract', 'lego', 'complete'],
    })).toBe('lego');
  });

  it('classifies base text2music model correctly when task_types contain both', () => {
    expect(inferModelCategory({
      name: 'acestep-v15-base-4B-900k-sft-60k',
      supported_task_types: ['text2music', 'repaint', 'cover', 'extract', 'lego', 'complete'],
    })).toBe('text2music');
  });
});
