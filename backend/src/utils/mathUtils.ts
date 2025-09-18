// Simple utility function to test
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function isEven(num: number): boolean {
  return num % 2 === 0;
}

export function formatQuery(query: string): string {
  return query.trim().toLowerCase();
}