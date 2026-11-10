import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import type { Collection } from '@workouts/core';
import { COLLECTION_PAGES } from './components/workouts/collections.ts';
import { DetailPage } from './pages/DetailPage.tsx';
import { ListPage } from './pages/ListPage.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { PlayerPage } from './pages/PlayerPage.tsx';

const Styleguide = import.meta.env.DEV ? lazy(() => import('./pages/StyleguidePage.tsx')) : null;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ListPage />} />
      {Object.entries(COLLECTION_PAGES).map(([id, p]) => (
        <Route key={id} path={p.path} element={<ListPage key={id} collection={id as Collection} />} />
      ))}
      <Route path="/w/:id" element={<DetailPage />} />
      <Route path="/w/:id/play" element={<PlayerPage />} />
      {Styleguide && (
        <Route
          path="/_styleguide"
          element={
            <Suspense>
              <Styleguide />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Hash routing: GitHub Pages has no SPA fallback, so deep links live after the #.
export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
