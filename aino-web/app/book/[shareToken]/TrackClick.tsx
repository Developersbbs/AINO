'use client';

import { useEffect } from 'react';

export default function TrackClick({ shareToken }: { shareToken: string }) {
  useEffect(() => {
    // Fire-and-forget — records first_click_at on the lead row
    fetch(`/api/track/${shareToken}`, { method: 'POST' }).catch(() => {});
  }, [shareToken]);

  return null;
}
