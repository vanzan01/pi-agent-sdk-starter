import { useCallback, useEffect, useRef, useState } from 'react';

const WORKSPACE_FALLBACK_LABEL = 'the configured workspace directory';
const IMAGE_FILE_EXTENSIONS = new Set([
  'png',
  'apng',
  'avif',
  'gif',
  'jpg',
  'jpeg',
  'jfif',
  'pjpeg',
  'pjp',
  'svg',
  'webp',
  'bmp',
  'ico',
  'cur',
  'heic',
  'heif',
  'tif',
  'tiff'
]);

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  previewIsBlobUrl?: boolean;
  isImage: boolean;
}

export function releaseAttachmentPreviews(attachments: PendingAttachment[]): void {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl && attachment.previewIsBlobUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
}

function isLikelyImageFile(file: File): boolean {
  if (file.type?.startsWith('image/')) {
    return true;
  }
  const extension = file.name?.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_FILE_EXTENSIONS.has(extension);
}

async function createImagePreview(file: File): Promise<{ url: string; isBlob: boolean } | null> {
  try {
    const dataUrl = await readFileAsDataUrl(file);
    return dataUrl ? { url: dataUrl, isBlob: false } : null;
  } catch {
    try {
      const objectUrl = URL.createObjectURL(file);
      return { url: objectUrl, isBlob: true };
    } catch {
      return null;
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Invalid preview data'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

export interface UseChatAttachmentsArgs {
  workspaceDir: string | null;
  maxAttachmentBytes: number;
}

export interface UseChatAttachmentsResult {
  pendingAttachments: PendingAttachment[];
  attachmentError: string | null;
  handleFilesSelected: (fileList: FileList | File[]) => void;
  handleRemoveAttachment: (attachmentId: string) => void;
  clearPendingAttachments: () => void;
  consumePendingAttachments: () => PendingAttachment[];
}

export function useChatAttachments({
  workspaceDir,
  maxAttachmentBytes
}: UseChatAttachmentsArgs): UseChatAttachmentsResult {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      releaseAttachmentPreviews(pendingAttachmentsRef.current);
    };
  }, []);

  const handleFilesSelected = (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      return;
    }

    const processFiles = async () => {
      const accepted: PendingAttachment[] = [];
      let rejectionMessage: string | null = null;

      const maxSizeMb = Math.floor(maxAttachmentBytes / (1024 * 1024));

      for (const file of files) {
        if (file.size > maxAttachmentBytes) {
          const workspaceLabel = workspaceDir ?? WORKSPACE_FALLBACK_LABEL;
          rejectionMessage =
            `"${file.name}" is larger than ${maxSizeMb} MB. ` +
            `Please drop it directly into the Pi Agent workspace at ${workspaceLabel}.`;
          continue;
        }

        const isImage = isLikelyImageFile(file);
        let previewUrl: string | undefined;
        let previewIsBlobUrl = false;

        if (isImage) {
          const preview = await createImagePreview(file);
          if (preview?.url) {
            previewUrl = preview.url;
            previewIsBlobUrl = preview.isBlob;
          }
        }

        accepted.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          previewIsBlobUrl,
          isImage
        });
      }

      if (accepted.length > 0) {
        setPendingAttachments((prev) => [...prev, ...accepted]);
      }

      if (rejectionMessage) {
        setAttachmentError(rejectionMessage);
      } else if (accepted.length > 0) {
        setAttachmentError(null);
      }
    };

    void processFiles();
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl && target.previewIsBlobUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      releaseAttachmentPreviews(prev);
      return [];
    });
    setAttachmentError(null);
  }, []);

  const consumePendingAttachments = (): PendingAttachment[] => {
    const current = pendingAttachmentsRef.current;
    if (current.length === 0) {
      return [];
    }
    setPendingAttachments([]);
    setAttachmentError(null);
    return current;
  };

  return {
    pendingAttachments,
    attachmentError,
    handleFilesSelected,
    handleRemoveAttachment,
    clearPendingAttachments,
    consumePendingAttachments
  };
}
