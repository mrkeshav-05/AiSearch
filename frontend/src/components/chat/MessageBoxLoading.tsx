"use client";

const MessageBoxLoading = () => {
  return (
    <div className="flex flex-col gap-6 w-full lg:w-9/12 animate-fade-in">
      {/* AI answer card skeleton */}
      <div className="ai-answer-card rounded-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full skeleton" />
          <div className="h-3 w-20 rounded-full skeleton" />
        </div>

        {/* Typing indicator */}
        <div className="flex items-center gap-1.5 py-1">
          <span className="typing-dot" style={{ animationDelay: "0ms" }} />
          <span className="typing-dot" style={{ animationDelay: "160ms" }} />
          <span className="typing-dot" style={{ animationDelay: "320ms" }} />
        </div>

        {/* Text lines */}
        <div className="space-y-2.5">
          <div className="h-3 rounded-full skeleton w-full" />
          <div className="h-3 rounded-full skeleton w-11/12" />
          <div className="h-3 rounded-full skeleton w-4/5" />
          <div className="h-3 rounded-full skeleton w-full" />
          <div className="h-3 rounded-full skeleton w-3/4" />
        </div>
      </div>

      {/* Sources skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded skeleton" />
          <div className="h-3 w-16 rounded-full skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="source-card p-3 space-y-2">
              <div className="h-2.5 rounded-full skeleton w-full" />
              <div className="h-2.5 rounded-full skeleton w-3/4" />
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-3.5 h-3.5 rounded-full skeleton flex-shrink-0" />
                <div className="h-2 rounded-full skeleton w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageBoxLoading;