import { configure } from '@testing-library/dom';

// The full Windows worker pool can make route effects settle after Testing
// Library's 1s default, especially while large lazy curriculum chunks are
// transformed in parallel. Keep component assertions strict but give async
// UI state enough time to appear under the same contention CI sees.
configure({ asyncUtilTimeout: 15_000 });
