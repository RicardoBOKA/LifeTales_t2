import { StorySpace, Note, NoteType } from '../types';

/**
 * Creates a demo story space with sample moments
 */
export const createDemoStory = (): StorySpace => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const demoNotes: Note[] = [
    {
      id: 'demo-1',
      type: NoteType.MOMENT,
      timestamp: now - (5 * oneDay),
      title: 'Moment n°1',
      textContent: 'Just arrived in Paris! The energy of this city is incredible. Can\'t wait to explore.',
    },
    {
      id: 'demo-2',
      type: NoteType.MOMENT,
      timestamp: now - (4 * oneDay) - (8 * 60 * 60 * 1000), // 4 days ago, morning
      title: 'Moment n°2',
      textContent: 'Morning at the Eiffel Tower. The golden light is breathtaking.',
    },
    {
      id: 'demo-3',
      type: NoteType.MOMENT,
      timestamp: now - (4 * oneDay) - (6 * 60 * 60 * 1000), // 4 days ago, afternoon
      title: 'Moment n°3',
      textContent: 'Walking along the Seine. Street musicians everywhere, the smell of fresh crepes in the air.',
    },
    {
      id: 'demo-4',
      type: NoteType.MOMENT,
      timestamp: now - (3 * oneDay) - (10 * 60 * 60 * 1000), // 3 days ago
      title: 'Moment n°4',
      textContent: 'Visited the Louvre today. Spent hours just wandering through the galleries. The Mona Lisa was smaller than I expected!',
    },
    {
      id: 'demo-5',
      type: NoteType.MOMENT,
      timestamp: now - (2 * oneDay) - (7 * 60 * 60 * 1000), // 2 days ago
      title: 'Moment n°5',
      textContent: 'Found this amazing little café in Montmartre. Best croissants I\'ve ever tasted. Met a local artist who showed me around.',
    },
    {
      id: 'demo-6',
      type: NoteType.MOMENT,
      timestamp: now - (1 * oneDay) - (9 * 60 * 60 * 1000), // Yesterday
      title: 'Moment n°6',
      textContent: 'Sunset from Sacré-Cœur. The whole city spread out below, bathed in golden light. Unforgettable.',
    },
    {
      id: 'demo-7',
      type: NoteType.MOMENT,
      timestamp: now - (1 * oneDay) - (3 * 60 * 60 * 1000), // Yesterday evening
      title: 'Moment n°7',
      textContent: 'Dinner at a tiny bistro. Amazing wine, even better conversation with fellow travelers from around the world.',
    },
    {
      id: 'demo-8',
      type: NoteType.MOMENT,
      timestamp: now - (2 * 60 * 60 * 1000), // 2 hours ago
      title: 'Moment n°8',
      textContent: 'Last morning in Paris. Having coffee at the same café where this all started. Feeling grateful for every moment.',
    },
  ];

  return {
    id: 'demo-space',
    title: 'Paris Adventure 🇫🇷',
    description: 'A week exploring the city of lights',
    startDate: now - (5 * oneDay),
    notes: demoNotes,
    generatedStory: []
  };
};

