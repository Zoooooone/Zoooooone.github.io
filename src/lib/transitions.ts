import type { TransitionDirectionalAnimations } from 'astro';

export const sweep: TransitionDirectionalAnimations = {
  forwards: {
    old: { name: 'sweep-out-fwd', duration: '0.22s', easing: 'cubic-bezier(0.4, 0, 1, 1)', fillMode: 'forwards' },
    new: { name: 'sweep-in-fwd', duration: '0.55s', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fillMode: 'backwards' },
  },
  backwards: {
    old: { name: 'sweep-out-back', duration: '0.22s', easing: 'cubic-bezier(0.4, 0, 1, 1)', fillMode: 'forwards' },
    new: { name: 'sweep-in-back', duration: '0.55s', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fillMode: 'backwards' },
  },
};
