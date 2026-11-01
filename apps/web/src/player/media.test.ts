import { describe, expect, it } from 'vitest';
import { isImage } from './media.ts';

describe('isImage', () => {
  it.each([
    'https://briandant.github.io/workouts/demos/foam-roller-chest-opener.svg',
    'https://example.com/a.GIF',
    'https://example.com/a.webp?v=2',
    'https://example.com/a.png#x',
    'https://example.com/a.jpeg',
  ])('is true for the image %s', (url) => {
    expect(isImage(url)).toBe(true);
  });

  it.each(['https://example.com/a.mp4', 'https://youtu.be/abc', 'https://example.com/svg', 'not a url'])(
    'is false for %s',
    (url) => {
      expect(isImage(url)).toBe(false);
    },
  );
});
