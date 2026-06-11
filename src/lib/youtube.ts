/**
 * YouTube URL utilities — shared across CourseDetailPage and CoursePlayerPage.
 */

/**
 * Extracts a YouTube video ID from any YouTube URL format:
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * Returns the 11-char video ID or null.
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const embedMatch = url.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  return null;
}

/**
 * Builds a privacy-enhanced embed URL from any YouTube URL.
 * Returns null if the URL is not a recognised YouTube format.
 */
export function buildYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1`;
}

/**
 * Returns the highest-quality thumbnail URL for a YouTube video.
 */
export function getYouTubeThumbnailUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}
