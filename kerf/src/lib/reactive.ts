import type { State } from '@kerf-js/core';

/** Apply an event's value or immutable update to a native Kerf state box. */
export function update<T>(box: State<T>, next: T | ((current: T) => T)) {
  box.value = typeof next === 'function' ? (next as (current: T) => T)(box.value) : next;
}
