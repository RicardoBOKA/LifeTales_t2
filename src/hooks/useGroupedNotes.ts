import { useMemo, useState, useCallback } from 'react';
import { Note } from '../types';
import { groupNotesByDate } from '../utils/noteHelpers';

export function useGroupedNotes(notes: Note[], startDate: number) {
  // Collapsed state for day groups: key = date string, value = isCollapsed
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Group notes by Day
  const groupedNotes = useMemo(() => {
    return groupNotesByDate(notes);
  }, [notes]);

  const groupedNoteEntries = useMemo(
    () => Object.entries(groupedNotes) as [string, Note[]][],
    [groupedNotes]
  );

  // Initialize collapse state: Expand the most recent day (first key), collapse others
  const initializeCollapseState = useCallback(() => {
    const dates = Object.keys(groupedNotes);
    if (dates.length > 0 && Object.keys(collapsedDays).length === 0) {
      const initialState: Record<string, boolean> = {};
      dates.forEach((date, index) => {
        // index 0 is the first group (newest date if notes are newest-first)
        initialState[date] = index !== 0; 
      });
      setCollapsedDays(initialState);
    }
  }, [groupedNotes, collapsedDays]);

  const toggleDayCollapse = useCallback((dateKey: string) => {
    setCollapsedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  }, []);

  const expandDay = useCallback((dateKey: string) => {
    setCollapsedDays(prev => ({ ...prev, [dateKey]: false }));
  }, []);

  return {
    groupedNotes,
    groupedNoteEntries,
    collapsedDays,
    toggleDayCollapse,
    expandDay,
    initializeCollapseState
  };
}

