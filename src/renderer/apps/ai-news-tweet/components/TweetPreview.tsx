import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

type TweetPreviewProps = {
  tweet: string | null;
};

export function TweetPreview({ tweet }: TweetPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!tweet) return null;

  const charCount = tweet.length;
  const isNearLimit = charCount > 240;
  const isOverLimit = charCount > 280;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tweet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] p-5 shadow-sm">
      {/* Label */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg text-[var(--accent-coral)]">✦</span>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-tertiary)]">
            Generated Tweet
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border-light)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--user-bubble)]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Tweet content as quote */}
      <div className="relative">
        <div className="absolute -top-2 left-0 font-serif text-6xl leading-none text-[var(--border-light)]">
          &ldquo;
        </div>
        <blockquote className="pl-8 pr-4">
          <p className="font-serif text-xl leading-relaxed text-[var(--text-primary)]">
            {tweet}
          </p>
        </blockquote>
        <div className="absolute -bottom-4 right-4 font-serif text-6xl leading-none text-[var(--border-light)]">
          &rdquo;
        </div>
      </div>

      {/* Footer with character count */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span>Ready for</span>
          <span className="font-semibold text-[var(--text-primary)]">𝕏</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--border-light)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((charCount / 280) * 100, 100)}%`,
                backgroundColor: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : 'var(--accent-coral)'
              }}
            />
          </div>
          <span
            className={`text-xs font-medium ${
              isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-[var(--text-secondary)]'
            }`}
          >
            {charCount}/280
          </span>
        </div>
      </div>
    </div>
  );
}
