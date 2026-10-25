/// <reference types="vitest/config" />
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { parseWorkoutFile } from '../../packages/core/src/index.ts';

const workoutsDir = resolve(import.meta.dirname, '../../workouts');

/** Fail the build (and the dev server) when a workout file is invalid. */
function validateWorkouts(): Plugin {
  return {
    name: 'validate-workouts',
    buildStart() {
      for (const f of readdirSync(workoutsDir).filter((n) => n.endsWith('.json'))) {
        parseWorkoutFile(readFileSync(resolve(workoutsDir, f), 'utf8'), `workouts/${f}`);
      }
    },
  };
}

export default defineConfig({
  // Served from https://<user>.github.io/workouts/
  base: process.env.VITE_BASE ?? '/workouts/',
  plugins: [react(), tailwindcss(), validateWorkouts()],
  server: { port: 5190 },
  test: {
    name: 'web',
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
