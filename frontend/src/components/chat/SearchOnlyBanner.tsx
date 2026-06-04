"use client";

import { WifiOff, ImageIcon, VideoIcon, RefreshCcw } from "lucide-react";

const SearchOnlyBanner = ({ provider }: { provider?: string }) => {
  return (
    <div className="search-only-banner animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <WifiOff size={14} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-200/90">
            AI generation temporarily unavailable
            {provider && (
              <span className="ml-1.5 text-xs font-normal text-amber-400/70">
                ({provider} rate limited)
              </span>
            )}
          </p>
          <p className="text-xs text-amber-300/60 mt-0.5">
            Displaying search results instead. AI will resume automatically when quotas reset.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[10px] text-amber-400/60">
              <ImageIcon size={10} />
              <span>Images available</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-400/60">
              <VideoIcon size={10} />
              <span>Videos available</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-400/60">
              <RefreshCcw size={10} />
              <span>Auto-retry in ~5 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOnlyBanner;
