import { store, derive, join, mountMaybe, unwrap } from '../src';

test('simple store', () => {
  const num = store(42);
  const cb = jest.fn();
  num.sub(cb);
  expect(num.get()).toEqual(42);
  num.emit(3);
  expect(num.get()).toEqual(3);
  expect(cb).toHaveBeenCalledWith(3);
});

test('simple store does not emit when equal', () => {
  const num = store(42);
  const cb = jest.fn();
  num.sub(cb);
  expect(num.get()).toEqual(42);
  num.emit(42);
  expect(num.get()).toEqual(42);
  expect(cb).not.toHaveBeenCalled();
});

test('derive', () => {
  const num = store(3);
  const double = derive(num, v => v * 2);
  expect(double.get()).toEqual(6);
  const cb = jest.fn();
  double.sub(cb);
  num.emit(10);
  expect(double.get()).toEqual(20);
  expect(cb).toHaveBeenCalledWith(20);
});

test('derive multiple', () => {
  const num = store(3);
  const double = derive(num, v => v * 2);
  const plusThree = derive(double, v => v + 3);
  expect(plusThree.get()).toEqual(9);
  const cb = jest.fn();
  plusThree.sub(cb);
  num.emit(10);
  expect(plusThree.get()).toEqual(23);
  expect(cb).toHaveBeenCalledWith(23);
});

test('join', () => {
  const num = store(3);
  const str = store('a');
  const result = join({ num, str });
  expect(result.get()).toEqual({ num: 3, str: 'a' });
  const cb = jest.fn();
  result.sub(cb);
  num.emit(6);
  expect(result.get()).toEqual({ num: 6, str: 'a' });
  expect(cb.mock.calls[0]).toEqual([{ num: 6, str: 'a' }]);
});

test('join then derive', () => {
  const num = store(3);
  const str = store('a');
  const result = derive(join({ num, str }), ({ num, str }) => str + num);
  expect(result.get()).toEqual('a3');
  const cb = jest.fn();
  result.sub(cb);
  num.emit(6);
  str.emit('b');
  expect(result.get()).toEqual('b6');
  expect(cb.mock.calls).toEqual([['a6'], ['b6']]);
});

test('derived twice then join should emit only once', () => {
  const num = store(3);
  const double = derive(num, v => v * 2);
  const numStr = derive(num, v => v.toFixed(0));
  const joined = derive(join({ double, numStr }), ({ double, numStr }) => numStr + '-' + double);
  expect(joined.get()).toEqual('3-6');
  const cb = jest.fn();
  joined.sub(cb);
  num.emit(1);
  expect(joined.get()).toEqual('1-2');
  expect(cb.mock.calls).toEqual([['1-2']]);
});

test('advanced', () => {
  const num = store(3);
  const double = derive(num, v => v * 2);
  const numStr = derive(num, v => v.toFixed(0));
  const joined1 = derive(join({ double, numStr }), ({ double, numStr }) => numStr + '-' + double);
  const joined2 = derive(
    join({ joined1, double }),
    ({ double, joined1 }) => joined1 + '_' + double
  );
  expect(joined2.get()).toEqual('3-6_6');
  const cb = jest.fn();
  joined2.sub(cb);
  num.emit(1);
  expect(joined2.get()).toEqual('1-2_2');
  expect(cb.mock.calls).toEqual([['1-2_2']]);
});

test('mountMaybe', () => {
  const base = store<number | null>(null);
  const num = store(4);
  const mounted = mountMaybe(base, num => {
    const double = derive(num, n => n * 2);
    return derive(join({ double, num }), ({ double, num }) => num * double);
  });
  const unwraped = unwrap(mounted);
  const cb = jest.fn();
  unwraped.sub(cb);
  base.emit(2);
  base.emit(null);
  num.emit(2);
  base.emit(6);
  base.emit(6);
  num.emit(4);
  expect(cb.mock.calls).toEqual([[8], [null], [72]]);
});
