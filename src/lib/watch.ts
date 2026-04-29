import type { EpisodeItem } from "./types";

export type EpisodeNavigationItem = {
  id: string;
  index: number;
  title: string;
  url: string;
  isCurrent: boolean;
};

export type WatchNavigation = {
  detailUrl: string;
  current: EpisodeNavigationItem | null;
  previous: EpisodeNavigationItem | null;
  next: EpisodeNavigationItem | null;
  episodes: EpisodeNavigationItem[];
};

type WatchNavigationInput = {
  collection: string;
  contentId: string;
  episodeKey: string;
  episodes: EpisodeItem[];
};

export function videoSourceFor(episode: EpisodeItem | null | undefined) {
  return episode?.video_url || Object.values(episode?.qualities ?? {})[0] || null;
}

export function createWatchNavigation({ collection, contentId, episodeKey, episodes }: WatchNavigationInput): WatchNavigation {
  const detailUrl = `/${collection}/${contentId}`;
  const episodeLinks = episodes.map((episode) => ({
    id: episode.id,
    index: episode.index,
    title: episode.title,
    url: `${detailUrl}/watch/${episode.index}`,
    isCurrent: episode.id === episodeKey || String(episode.index) === episodeKey
  }));

  const currentIndex = episodeLinks.findIndex((episode) => episode.isCurrent);

  return {
    detailUrl,
    current: currentIndex >= 0 ? episodeLinks[currentIndex] : null,
    previous: currentIndex > 0 ? episodeLinks[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < episodeLinks.length - 1 ? episodeLinks[currentIndex + 1] : null,
    episodes: episodeLinks
  };
}
