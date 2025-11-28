/**
 * Helper to determine day number relative to start date
 */
export const getDayNumber = (startDate: number, currentTimestamp: number): number => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const current = new Date(currentTimestamp);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(current.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays + 1; // Day 1 is the start day
};

/**
 * Format timestamp to readable date string
 */
export const formatDateKey = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format timestamp to time string
 */
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date for display
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString();
};

