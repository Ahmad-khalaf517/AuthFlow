import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('waits for the delay and cancels superseded updates', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'first', delay: 300 },
    });
    rerender({ value: 'second', delay: 300 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('first');
    rerender({ value: 'third', delay: 300 });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('first');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('third');
  });
});
