import type { BacaCategory, ContentType, NormalizedItem } from "./types";

export const CONTENT_TYPES: Array<{ type: ContentType; label: string; href: string; accent: string }> = [
  { type: "dramas", label: "Short Drama", href: "/dramas", accent: "bg-peach-300" },
  { type: "anime", label: "Anime", href: "/anime", accent: "bg-sage-300" },
  { type: "moviebox", label: "MovieBox", href: "/moviebox", accent: "bg-teal-500" },
  { type: "iqiyi", label: "iQIYI", href: "/iqiyi", accent: "bg-cream-100" },
  { type: "wetv", label: "WeTV", href: "/wetv", accent: "bg-peach-500" },
  { type: "drakor", label: "DrakorIndo", href: "/drakor", accent: "bg-sage-500" }
];

export const BACA_CATEGORIES: Array<{ category: BacaCategory; label: string; href: string }> = [
  { category: "manga", label: "Manga", href: "/baca/manga" },
  { category: "manhwa", label: "Manhwa", href: "/baca/manhwa" },
  { category: "manhua", label: "Manhua", href: "/baca/manhua" }
];

export function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.some((item) => item.type === value);
}

export function isBacaCategory(value: string): value is BacaCategory {
  return BACA_CATEGORIES.some((item) => item.category === value);
}

export function itemHref(item: NormalizedItem) {
  if (item.type.startsWith("baca-")) {
    return `/baca/${item.type.replace("baca-", "")}/${item.id}`;
  }
  return `/${item.type}/${item.id}`;
}

export function labelFor(type: string) {
  return CONTENT_TYPES.find((item) => item.type === type)?.label ?? BACA_CATEGORIES.find((item) => item.category === type)?.label ?? type;
}
