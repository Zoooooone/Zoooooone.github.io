import type { Post } from './types';

const isTravel = (post: Post) => post.data.categories.includes('Travels');

export const kindOf = (post: Post): 'tech' | 'travel' | 'life' =>
  isTravel(post) ? 'travel' : post.data.categories[0] === 'Study notes' ? 'tech' : 'life';

export const coverOf = (post: Post): string | undefined => {
  const img = post.data.image;
  return typeof img === 'string' ? img : img?.path;
};
