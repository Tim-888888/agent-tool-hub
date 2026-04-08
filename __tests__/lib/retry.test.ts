// @jest-environment node
import { withRetry } from '@/lib/retry';

describe('withRetry', () => {
  it('succeeds on first attempt when no error', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on second attempt after first failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, 3);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));

    await expect(withRetry(fn, 2)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries correct number of times with maxRetries=3', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fail'));

    await expect(withRetry(fn, 3)).rejects.toThrow('always fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('passes through the error from the final attempt', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'));

    await expect(withRetry(fn, 2)).rejects.toThrow('second');
  });
});
