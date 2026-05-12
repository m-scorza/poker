import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';

describe('App Routing Smoke Test', () => {
  const routes = ['/', '/hands', '/career', '/sessions', '/leaks'];

  for (const route of routes) {
    it(`renders route ${route} without crashing`, () => {
      // This will catch React Router nesting errors (e.g., <Suspense> inside <Routes>)
      expect(() => {
        renderToString(
          <MemoryRouter initialEntries={[route]}>
            <AppRoutes />
          </MemoryRouter>
        );
      }).not.toThrow();
    });
  }
});
