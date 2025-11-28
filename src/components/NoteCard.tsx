import React, { useState } from 'react';
import { Note, NoteType } from '../types';
import { Mic, FileText, Plus } from 'lucide-react';
import { formatTime } from '../utils/dateHelpers';

interface NoteCardProps {
  note: Note;
  onUpdate: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempTitle, setTempTitle] = useState(note.title || (note.type === NoteType.AUDIO ? 'Voice Note' : 'Text Note'));
  const [tempDesc, setTempDesc] = useState(note.description || '');

  const saveTitle = () => {
    setIsEditingTitle(false);
    if (tempTitle !== note.title) {
      onUpdate({ ...note, title: tempTitle });
    }
  };

  const saveDesc = () => {
    setIsEditingDesc(false);
    if (tempDesc !== note.description) {
      onUpdate({ ...note, description: tempDesc });
    }
  };

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-stone-300 rounded-full mt-2"></div>
        <div className="w-px bg-stone-200 flex-1 my-1"></div>
      </div>
      <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-stone-100 relative">
        <div className="flex justify-between items-start mb-2">
          {/* Editable Title Section */}
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-xs font-bold text-stone-400 flex items-center gap-1 shrink-0">
                  {note.type === NoteType.AUDIO ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {formatTime(note.timestamp)}
               </span>
            </div>

            {isEditingTitle ? (
              <input 
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                autoFocus
                className="w-full font-bold text-ink bg-stone-50 px-1 -ml-1 rounded border-none focus:ring-1 focus:ring-primary/50 text-sm"
              />
            ) : (
              <h4 
                onClick={() => setIsEditingTitle(true)}
                className="font-bold text-ink text-sm cursor-text hover:text-primary transition-colors truncate"
                title="Click to rename"
              >
                {note.title || (note.type === NoteType.AUDIO ? 'Voice Note' : 'Text Note')}
              </h4>
            )}
            
            {/* Description Section */}
            {isEditingDesc ? (
               <textarea
                 value={tempDesc}
                 onChange={(e) => setTempDesc(e.target.value)}
                 onBlur={saveDesc}
                 autoFocus
                 rows={2}
                 placeholder="Add a description..."
                 className="w-full mt-1 text-xs text-stone-600 bg-stone-50 p-1 -ml-1 rounded border-none focus:ring-1 focus:ring-primary/50 resize-none"
               />
            ) : (
              <div 
                onClick={() => setIsEditingDesc(true)}
                className={`mt-1 text-xs cursor-text group/desc ${!note.description ? 'opacity-0 group-hover:opacity-100' : ''}`}
              >
                {note.description ? (
                  <p className="text-stone-600 hover:text-ink">{note.description}</p>
                ) : (
                   <span className="flex items-center gap-1 text-stone-300 hover:text-primary transition-colors">
                     <Plus className="h-3 w-3" /> Add description
                   </span>
                )}
              </div>
            )}
          </div>
        </div>

        {note.type === NoteType.AUDIO && (
            <div className="space-y-2 mt-3">
              {/* Mock Audio Player Visualization */}
              <div className="h-8 bg-stone-100 rounded-full flex items-center px-3 gap-1 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-1 bg-stone-300 rounded-full" style={{ height: `${Math.random() * 100}%`}}></div>
                ))}
              </div>
              <p className="text-sm text-ink/80 italic pl-1 border-l-2 border-stone-200">"{note.transcription}"</p>
            </div>
        )}
        {note.type === NoteType.TEXT && <p className="text-sm text-ink mt-2">{note.content}</p>}
      </div>
    </div>
  );
};

