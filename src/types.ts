export type Callback = () => void;
export type ValueCallback<T> = (value: T) => void;
export type SubscribeMethod<T> = (onChange: ValueCallback<T>, onUnsub?: Callback) => Callback;

export type ValOrUpdateFn<T> = T | ((prev: T) => T);

export const SYNCLOCK = Symbol('SYNCLOCK');

export interface Clock {
  emit(): void;
  subscribe(tick: number, callback: Callback): Callback;
  destroy: () => void;
}

export type ExtractValues<T extends { [key: string]: Value<any> }> = {
  [K in keyof T]: T[K] extends Value<infer U> ? U : never;
};

export type Internal = () => {
  clock: Clock;
  tick: number;
};

export interface Destroyable {
  destroy: () => void;
}

export interface Value<Out> {
  [SYNCLOCK]: Internal;
  destroy: () => void;
  sub: SubscribeMethod<Out>;
  get: () => Out;
}

export interface Store<In, Out> {
  [SYNCLOCK]: Internal;
  destroy: () => void;
  sub: SubscribeMethod<Out>;
  get: () => Out;
  emit: (input: In) => void;
}
