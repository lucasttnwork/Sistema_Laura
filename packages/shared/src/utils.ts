// Shared utility functions for BMAD project

/**
 * Format phone number to Brazilian WhatsApp format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Add +55 prefix if not present
  if (!cleaned.startsWith('55')) {
    return `+55${cleaned}`;
  }

  return `+${cleaned}`;
}

/**
 * Validate WhatsApp phone number format
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const regex = /^\+55\d{10,11}$/;
  return regex.test(phone);
}

/**
 * Generate a random phone number for testing
 */
export function generateRandomPhone(): string {
  const ddd = Math.floor(Math.random() * 90) + 10; // 10-99
  const number = Math.floor(Math.random() * 900000000) + 100000000; // 9 digits
  return `+55${ddd}9${number.toString().slice(1)}`;
}

/**
 * Format currency value to Brazilian Real
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Format date to Brazilian format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for operations that might fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        await sleep(delay * attempt); // Exponential backoff
      }
    }
  }

  throw lastError!;
}
