import { onPage, type Cleanup } from '@/scripts/core/lifecycle';
import { runGalleries, runGalleryReveal } from './gallery';
import { runMermaid } from './mermaid';
import { runProseImages } from './prose-images';
import { runReadingProgress } from './reading-progress';
import { runTocFold, runTocSpy } from './toc';

onPage(() => {
  const cleanups: Cleanup[] = [];
  let stale = false;
  const isStale = () => stale;

  runReadingProgress(cleanups);
  runTocSpy(cleanups);
  runTocFold(cleanups);
  runProseImages(cleanups);
  void runMermaid(cleanups, isStale);
  void runGalleries(cleanups, isStale).then(() => {
    if (!stale) runGalleryReveal(cleanups);
  });

  return () => {
    stale = true;
    cleanups.forEach((fn) => fn());
  };
});
