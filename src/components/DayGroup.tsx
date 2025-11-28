import React from 'react';
import { Note } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { getDayNumber } from '../utils/dateHelpers';

interface DayGroupProps {
  dateKey: string;
  notes: Note[];
  startDate: number;
  isCollapsed: boolean;
  onToggleCollapse: (dateKey: string) => void;
  onUpdateNote: (note: Note) => void;
}

export const DayGroup: React.FC<DayGroupProps> = ({
  dateKey,
  notes,
  startDate,
  isCollapsed,
  onToggleCollapse,
  onUpdateNote
}) => {
  const firstNote = notes[0];
  const dayNumber = getDayNumber(startDate, firstNote.timestamp);

  return (
    <div className="mb-6">
      {/* Day Header */}
      <div 
        onClick={() => onToggleCollapse(dateKey)}
        className="flex items-center gap-2 py-3 cursor-pointer group select-none sticky top-0 bg-paper/95 backdrop-blur-sm z-10"
      >
        <div className={`p-1 rounded-full transition-colors ${isCollapsed ? 'text-stone-400 bg-stone-100' : 'text-primary bg-primary/10'}`}>
           {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex-1">
          Day {dayNumber} <span className="text-stone-400 font-normal normal-case mx-1">—</span> <span className="text-stone-500 font-medium normal-case">{dateKey}</span>
        </h3>
        <span className="text-xs text-stone-300 font-medium px-2">{notes.length}</span>
      </div>

      {/* Notes List for Day */}
      {!isCollapsed && (
        <div className="space-y-6 mt-2 animate-fade-in pl-2">
           {notes.map(note => (
             <NoteCard 
                key={note.id} 
                note={note} 
                onUpdate={onUpdateNote} 
             />
           ))}
        </div>
      )}
    </div>
  );
};

