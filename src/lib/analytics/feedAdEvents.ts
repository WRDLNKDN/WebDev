import { supabase } from '../auth/supabaseClient';

type FeedAdEventName = 'feed_ad_impression' | 'feed_ad_click';

type FeedAdEventInput = {
  advertiserId: string;
  memberId: string | null;
  eventName: FeedAdEventName;
  slotIndex: number | null;
  target?: string | null;
  url?: string | null;
  pagePath?: string | null;
};

export const logFeedAdEvent = async (
  input: FeedAdEventInput,
): Promise<void> => {
  try {
    const { error } = await supabase.from('feed_ad_events').insert({
      advertiser_id: input.advertiserId,
      member_id: input.memberId,
      event_name: input.eventName,
      slot_index: input.slotIndex,
      target: input.target ?? null,
      url: input.url ?? null,
      page_path: input.pagePath ?? null,
    });
    if (error) throw error;
  } catch {
    // Non-blocking telemetry: keep feed UX stable if analytics write fails.
  }
};
