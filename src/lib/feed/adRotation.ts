export type FeedDisplayItem<TPost, TAd> =
  | { kind: 'post'; item: TPost }
  | { kind: 'ad'; advertiser: TAd };

export function interleaveWithAds<TPost, TAd>(
  posts: TPost[],
  advertisers: TAd[],
  everyN: number,
  includePost?: (post: TPost) => boolean,
): FeedDisplayItem<TPost, TAd>[] {
  if (advertisers.length === 0) {
    return posts
      .filter((item) => (includePost ? includePost(item) : true))
      .map((item) => ({ kind: 'post' as const, item }));
  }
  const result: FeedDisplayItem<TPost, TAd>[] = [];
  let adIndex = 0;
  posts.forEach((item, i) => {
    if ((i + 1) % everyN === 0) {
      const ad = advertisers[adIndex % advertisers.length];
      result.push({ kind: 'ad', advertiser: ad });
      adIndex += 1;
    }
    if (!includePost || includePost(item)) {
      result.push({ kind: 'post', item });
    }
  });
  return result;
}

export function hashStringToSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const shuffled = [...items];
  const rand = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getOrCreateSessionAdSeed(userId: string | null): number {
  if (typeof window === 'undefined') {
    return hashStringToSeed(`feed_ad_seed:${userId ?? 'anon'}`);
  }

  const key = `feed_ad_seed:${userId ?? 'anon'}`;
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing != null) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed)) {
        return parsed >>> 0;
      }
    }

    const generated = hashStringToSeed(
      `${key}:${Date.now()}:${Math.random().toString(36)}`,
    );
    window.sessionStorage.setItem(key, String(generated));
    return generated;
  } catch {
    return hashStringToSeed(`${key}:fallback`);
  }
}
