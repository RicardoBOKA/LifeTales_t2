import { Chapter, StorySpace, StorySettings } from '../types';

/**
 * Generate a filename-safe string from a title
 */
const sanitizeFilename = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
};

/**
 * Trigger a file download in the browser
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export story as Markdown file
 */
export const exportToMarkdown = (
  space: StorySpace,
  chapters: Chapter[],
  settings: StorySettings
): void => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let markdown = `# ${space.title}\n\n`;
  markdown += `> ${space.description}\n\n`;
  markdown += `---\n\n`;
  markdown += `*Generated on ${date}*\n\n`;
  markdown += `**Style:** ${settings.narrativeTone} | **Mode:** ${settings.storyMode}\n\n`;
  markdown += `---\n\n`;

  chapters.forEach((chapter, idx) => {
    markdown += `## Chapter ${idx + 1}: ${chapter.title}\n\n`;
    
    // Include user image reference if present
    if (chapter.userImageUrl) {
      markdown += `![Your photo](${chapter.userImageUrl})\n\n`;
    }
    
    // Include AI illustration reference if present
    if (chapter.illustrationUrl) {
      markdown += `![Illustration](${chapter.illustrationUrl})\n\n`;
    }
    
    // Add content with proper paragraph breaks
    const paragraphs = chapter.content.split('\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      markdown += `${para}\n\n`;
    });
    
    markdown += `---\n\n`;
  });

  // Add footer
  markdown += `\n---\n\n`;
  markdown += `*Created with LifeTales*\n`;

  const filename = `${sanitizeFilename(space.title)}-story.md`;
  downloadFile(markdown, filename, 'text/markdown');
};

/**
 * Export story as JSON file (full data with metadata)
 */
export const exportToJSON = (
  space: StorySpace,
  chapters: Chapter[],
  settings: StorySettings
): void => {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      app: 'LifeTales'
    },
    space: {
      id: space.id,
      title: space.title,
      description: space.description,
      coverImage: space.coverImage,
      startDate: space.startDate,
      notesCount: space.notes.length
    },
    settings: {
      narrativeTone: settings.narrativeTone,
      storyMode: settings.storyMode,
      creativity: settings.creativity,
      imageStyle: settings.imageStyle,
      imagesPerChapter: settings.imagesPerChapter
    },
    story: {
      chaptersCount: chapters.length,
      chapters: chapters.map((chapter, idx) => ({
        index: idx + 1,
        title: chapter.title,
        content: chapter.content,
        illustrationPrompt: chapter.illustrationPrompt,
        hasUserImage: !!chapter.userImageUrl,
        hasAIIllustration: !!chapter.illustrationUrl,
        // Include image URLs (can be large due to base64)
        userImageUrl: chapter.userImageUrl,
        illustrationUrl: chapter.illustrationUrl
      }))
    },
    // Include source notes for reference
    sourceNotes: space.notes.map(note => ({
      id: note.id,
      type: note.type,
      timestamp: note.timestamp,
      title: note.title,
      description: note.description,
      transcription: note.transcription,
      hasAudio: !!note.audioUrl,
      hasAttachedImage: !!note.attachedImageUrl
    }))
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const filename = `${sanitizeFilename(space.title)}-export.json`;
  downloadFile(jsonString, filename, 'application/json');
};

/**
 * Export story as plain text (for copying/pasting)
 */
export const exportToText = (
  space: StorySpace,
  chapters: Chapter[]
): string => {
  let text = `${space.title.toUpperCase()}\n`;
  text += `${'='.repeat(space.title.length)}\n\n`;
  text += `${space.description}\n\n`;
  text += `---\n\n`;

  chapters.forEach((chapter, idx) => {
    text += `CHAPTER ${idx + 1}: ${chapter.title.toUpperCase()}\n\n`;
    text += `${chapter.content}\n\n`;
    text += `---\n\n`;
  });

  return text;
};

