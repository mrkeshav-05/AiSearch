import { add, multiply, isEven, formatQuery } from '../../src/utils/mathUtils';

describe('Math Utils', () => {
  describe('add function', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    test('should add negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });

    test('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('multiply function', () => {
    test('should multiply two positive numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    test('should handle multiplication by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });

    test('should handle negative numbers', () => {
      expect(multiply(-2, 3)).toBe(-6);
      expect(multiply(-2, -3)).toBe(6);
    });
  });

  describe('isEven function', () => {
    test('should return true for even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(4)).toBe(true);
      expect(isEven(0)).toBe(true);
    });

    test('should return false for odd numbers', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(3)).toBe(false);
      expect(isEven(-1)).toBe(false);
    });
  });

  describe('formatQuery function', () => {
    test('should trim and lowercase query', () => {
      expect(formatQuery('  HELLO WORLD  ')).toBe('hello world');
    });

    test('should handle empty string', () => {
      expect(formatQuery('')).toBe('');
      expect(formatQuery('   ')).toBe('');
    });

    test('should handle mixed case', () => {
      expect(formatQuery('JavaScript Tutorial')).toBe('javascript tutorial');
    });
  });
});