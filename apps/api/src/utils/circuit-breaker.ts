import CircuitBreaker from 'opossum';
import { logger } from '../config/logger';

export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  name: string,
  options?: Partial<CircuitBreaker.Options>
): CircuitBreaker<any[], T> {
  const breaker = new CircuitBreaker(fn, {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name,
    ...options,
  });

  breaker.on('open', () => logger.warn({ circuit: name }, 'Circuit breaker opened'));
  breaker.on('halfOpen', () => logger.info({ circuit: name }, 'Circuit breaker half-open'));
  breaker.on('close', () => logger.info({ circuit: name }, 'Circuit breaker closed'));
  breaker.on('failure', (err: Error) =>
    logger.error({ circuit: name, error: err.message }, 'Circuit breaker call failed')
  );

  return breaker;
}
