/**
 * Format seconds into a MM:SS display
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};