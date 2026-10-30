/** Whether the person asked for less motion. Read it in a handler or an effect, never during render (the server has no window). */
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
