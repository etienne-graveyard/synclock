export type Callback = () => void;
export type ValueCallback<T> = (value: T) => void;
export type SubscribeMethod<T> = (onChange: ValueCallback<T>, onUnsub?: Callback) => Callback;

export const RIPOST_TICK = Symbol('RIPOST_TICK');

export type ExtractValues<T extends { [key: string]: Value<any> }> = {
  [K in keyof T]: T[K] extends Value<infer U> ? U : never;
};

export interface Destroyable {
  destroy: () => void;
}

export interface Value<Out> {
  [RIPOST_TICK]: number;
  destroy: () => void;
  sub: SubscribeMethod<Out>;
  get: () => Out;
}

export interface Store<In, Out> {
  [RIPOST_TICK]: number;
  destroy: () => void;
  sub: SubscribeMethod<Out>;
  get: () => Out;
  emit: (input: In) => void;
}
