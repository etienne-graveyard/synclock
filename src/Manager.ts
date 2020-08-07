import { Clock } from './Clock';
import { Context } from './Context';

export interface Manager {
  createContext: () => Context;
}

export function Manager() {
  const clock = Clock();

  return {
    createContext: () => Context(clock)
  };
}
