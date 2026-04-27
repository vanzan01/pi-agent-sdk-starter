import { Paperclip, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatFileSize } from '@/utils/formatFileSize';

export interface AttachmentPreviewItem {
  id: string;
  name: string;
  size: number;
  isImage?: boolean;
  previewUrl?: string;
  footnoteLines?: string[];
}

interface AttachmentPreviewListProps {
  attachments: AttachmentPreviewItem[];
  onRemove?: (id: string) => void;
  className?: string;
  cardClassName?: string;
  imageDimensions?: string;
}

export default function AttachmentPreviewList({
  attachments,
  onRemove,
  className = '',
  cardClassName = '',
  imageDimensions = 'h-28 w-28'
}: AttachmentPreviewListProps) {
  const [previewErrorIds, setPreviewErrorIds] = useState<string[]>([]);
  const previewErrorIdSet = useMemo(() => {
    const validIds = new Set(attachments.map((attachment) => attachment.id));
    return new Set(previewErrorIds.filter((id) => validIds.has(id)));
  }, [attachments, previewErrorIds]);

  const markPreviewError = (attachmentId: string) => {
    setPreviewErrorIds((prev) => (prev.includes(attachmentId) ? prev : [...prev, attachmentId]));
  };

  const handleRemove = (attachmentId: string) => {
    setPreviewErrorIds((prev) => prev.filter((id) => id !== attachmentId));
    onRemove?.(attachmentId);
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {attachments.map((attachment) => {
        const showImagePreview =
          attachment.isImage && attachment.previewUrl && !previewErrorIdSet.has(attachment.id);

        return (
          <div
            key={attachment.id}
            className={`relative rounded-2xl border border-neutral-200/80 bg-neutral-50 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-800/40 ${cardClassName}`}
          >
            {showImagePreview ?
              <div className={`relative overflow-hidden rounded-2xl ${imageDimensions}`}>
                <img
                  src={attachment.previewUrl}
                  alt={attachment.name}
                  className="h-full w-full object-cover"
                  onError={() => markPreviewError(attachment.id)}
                  loading="lazy"
                />
                <div className="absolute inset-x-1 bottom-1 rounded-md bg-neutral-900/70 px-1 py-0.5 text-[10px] font-medium text-white/90">
                  <span className="block truncate">{attachment.name}</span>
                </div>
              </div>
            : <div className="flex min-w-[14rem] items-center gap-3 px-3 py-2">
                <div className="rounded-full bg-neutral-200 p-2 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                    {attachment.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {formatFileSize(attachment.size)}
                  </p>
                  {attachment.footnoteLines?.map((line, index) => (
                    <p
                      key={`${attachment.id}-footnote-${index}`}
                      className="text-[11px] text-neutral-500 dark:text-neutral-400"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            }
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => handleRemove(attachment.id)}
                className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1 text-neutral-600 shadow-sm transition hover:bg-white dark:bg-neutral-900/80 dark:text-neutral-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
