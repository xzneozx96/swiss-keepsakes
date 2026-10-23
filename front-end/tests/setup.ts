import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// @testing-library/dom's `waitFor` checks `typeof jest !== "undefined"` to detect fake timers.
// Vitest defines no `jest` global, so without this alias `waitFor` hangs when timers are faked.
Object.assign(globalThis, { jest: vi })

// jsdom does not implement scrollIntoView.
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {}

// jsdom does not implement ResizeObserver or IntersectionObserver. Component libraries
// (HeroUI, react-aria) and our own hooks construct them on mount.
class StubObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = StubObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver
  = StubObserver as unknown as typeof IntersectionObserver

// jsdom does not implement matchMedia. Hooks such as `useIsWide` call it on mount.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom does not implement the Web Animations API (Element.getAnimations).
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => []
}

// jsdom does not implement Element.animate either. A closed bottom sheet slides out through it (playSheetExit).
if (!Element.prototype.animate) {
  Element.prototype.animate = (() => ({ finished: Promise.resolve() })) as unknown as typeof Element.prototype.animate
}
