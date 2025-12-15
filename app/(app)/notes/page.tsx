'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  Trash2, 
  Edit, 
  MoreVertical, 
  X, 
  Feather, 
  Loader2, 
  Filter, 
  Lightbulb, 
  Target, 
  Megaphone, 
  FileText 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RichEditor from '@/components/RichEditor';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import clsx from 'clsx';

// --- Configuration & Types ---

const CATEGORIES = [
  'Business Ideas', 
  'Marketing Ideas', 
  'Strategy & Planning', 
  'Other'
] as const;

type NoteCategory = typeof CATEGORIES[number];

interface Note {
  id: string;
  title: string;
  content: string | null;
  category: NoteCategory; 
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

// Visual styling map for categories - SOLID styles for badges
const CATEGORY_STYLES: Record<NoteCategory, { 
  bg: string; 
  text: string; 
  border: string; 
  icon: React.ElementType 
}> = {
  'Business Ideas': { 
    bg: 'bg-blue-100', // Solid background
    text: 'text-blue-800', // Darker text for contrast
    border: 'border-blue-200',
    icon: Lightbulb 
  },
  'Marketing Ideas': { 
    bg: 'bg-pink-100', 
    text: 'text-pink-800', 
    border: 'border-pink-200',
    icon: Megaphone 
  },
  'Strategy & Planning': { 
    bg: 'bg-emerald-100', 
    text: 'text-emerald-800', 
    border: 'border-emerald-200',
    icon: Target 
  },
  'Other': { 
    bg: 'bg-slate-100', 
    text: 'text-slate-800', 
    border: 'border-slate-200',
    icon: FileText 
  },
};

// --- Utility: Strip HTML ---
const stripHtmlAndLimit = (html: string | null, limit: number = 120) => {
    if (!html) return '';
    // Basic strip for preview
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    const decodedText = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    return decodedText.substring(0, limit) + (decodedText.length > limit ? '...' : '');
};

// --- Custom Hook: useOnClickOutside ---
const useOnClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// --- Modern Idea Card Component ---
const IdeaCard = ({ note, onEdit, onAction }: { note: Note; onEdit: (note: Note) => void; onAction: (id: string, action: 'pin' | 'delete') => void }) => {
  const contentSnippet = stripHtmlAndLimit(note.content);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(actionMenuRef, () => setIsMenuOpen(false));

  // Default to 'Other' if category is missing/invalid
  const category = CATEGORIES.includes(note.category) ? note.category : 'Other';
  const style = CATEGORY_STYLES[category];
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onEdit(note)}
      className={clsx(
        "group relative flex flex-col justify-between p-5 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] transition-all duration-300 cursor-pointer border",
        note.is_pinned 
          ? "border-[var(--warning)] shadow-[0_0_0_1px_var(--warning)]" 
          : "border-[var(--border-subtle)] hover:shadow-md hover:border-[var(--border)]"
      )}
    >
      {/* Header Area */}
      <div className="flex justify-between items-start mb-3">
        <div className={clsx(
          "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border",
          style.bg, style.text, style.border
        )}>
          <Icon size={12} />
          <span>{category}</span>
        </div>

        <div className="flex items-center gap-1">
          {note.is_pinned && (
            <Pin className="w-4 h-4 text-[var(--warning)] fill-[var(--warning)]" />
          )}
          
          {/* Actions Menu */}
          <div className="relative" ref={actionMenuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-6 w-36 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onEdit(note); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  >
                    <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                  </button>
                  <button
                    onClick={() => { onAction(note.id, 'pin'); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  >
                    <Pin className="w-3.5 h-3.5 mr-2" /> {note.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <div className="h-px bg-[var(--border-subtle)] my-1" />
                  <button
                    onClick={() => { onAction(note.id, 'delete'); setIsMenuOpen(false); }}
                    className="flex items-center w-full px-3 py-2 text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow space-y-2">
        <h3 className="text-lg font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">
          {note.title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
          {contentSnippet || <span className="italic text-[var(--text-tertiary)]">No content preview</span>}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
          {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </motion.div>
  );
};

// --- Editor Modal Component ---
interface NoteEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (noteData: Partial<Note>) => Promise<void>;
    initialData?: Note | null;
    isEditing?: boolean;
}

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ isOpen, onClose, onSave, initialData, isEditing = false }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<NoteCategory>('Other');
    // Store HTML content for the RichEditor
    const [editorContent, setEditorContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { notify } = useToast();

    // Initialize state when modal opens or data changes
    useEffect(() => {
        if (isOpen) {
            setTitle(isEditing && initialData ? initialData.title || '' : '');
            setCategory(isEditing && initialData ? initialData.category || 'Other' : 'Business Ideas');
            // Ensure we pass the HTML string correctly. If null, pass empty string.
            setEditorContent(isEditing && initialData ? initialData.content || '' : '');
        }
    }, [isOpen, isEditing, initialData]);

    // Callback for the RichEditor to update local state
    const handleEditorUpdate = useCallback((htmlContent: string) => {
        setEditorContent(htmlContent);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!title.trim()) {
            notify({ title: 'Title Required', description: 'Please enter a title.', variant: 'warning' });
            return;
        }
        if (isSaving) return;
        setIsSaving(true);

        const noteData: Partial<Note> = {
            id: isEditing ? initialData?.id : undefined,
            title: title.trim(),
            category,
            content: editorContent, // Pass the full HTML string from RichEditor
            is_pinned: isEditing ? initialData?.is_pinned : false,
        };

        try {
            await onSave(noteData);
        } catch (error) {
            console.error("Modal save failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClasses = "block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 w-full max-w-2xl rounded-[var(--radius-xl)] bg-[var(--bg-surface)] shadow-[var(--shadow-3)] border border-[var(--border-subtle)] flex flex-col max-h-[90vh]"
                        role="dialog" aria-modal="true"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                {isEditing ? "Edit Idea" : "Capture Idea"}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            <form id="note-form" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                            Title
                                        </label>
                                        <input
                                            type="text" required placeholder="e.g. Subscription Model Pivot"
                                            className={inputClasses} value={title}
                                            onChange={(e) => setTitle(e.target.value)} disabled={isSaving}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                            Category
                                        </label>
                                        <select 
                                            className={inputClasses}
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as NoteCategory)}
                                            disabled={isSaving}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                        Details
                                    </label>
                                    {/* Rich Editor Container */}
                                    <div className="border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-surface)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]/30 overflow-hidden">
                                        <RichEditor
                                            key={initialData?.id || 'new-note'}
                                            initialContent={editorContent}
                                            onUpdate={handleEditorUpdate}
                                            editable={!isSaving}
                                            editorClass="min-h-[250px] max-h-[50vh] text-sm p-4"
                                            placeholderText="Flesh out your strategy or idea here..."
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]/30 rounded-b-[var(--radius-xl)]">
                            <button
                                type="button" onClick={onClose}
                                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-white text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-muted)]"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit" form="note-form"
                                className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)] disabled:opacity-70 flex items-center gap-2"
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                {isSaving ? 'Saving...' : 'Save Idea'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- Main Page Component ---
export default function IdeasPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | NoteCategory>('All');
  
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const { notify } = useToast();

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const fetchNotes = useCallback(async (showLoading = false) => {
     if(showLoading) setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      notify({ title: 'Error', description: 'Could not load ideas.', variant: 'danger' });
      setNotes([]);
    } else {
      setNotes(data || []);
    }
     setIsLoading(false);
  }, [supabase, notify]);

  useEffect(() => {
    fetchNotes(true);
  }, [fetchNotes]);

  const sortedAndFilteredNotes = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return notes
      .filter(note => {
        const matchesSearch = 
          note.title.toLowerCase().includes(lowerSearchTerm) ||
          stripHtmlAndLimit(note.content, 500).toLowerCase().includes(lowerSearchTerm);
        
        const matchesCategory = filterCategory === 'All' || note.category === filterCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
        }
        return b.updated_at.localeCompare(a.updated_at);
      });
  }, [notes, searchTerm, filterCategory]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const handleSaveNote = useCallback(async (noteData: Partial<Note>) => {
    const isUpdating = !!noteData.id;
    const originalNotes = [...notes];

    try {
      if (isUpdating) {
        const optimisticUpdate = { 
            ...originalNotes.find(n => n.id === noteData.id), 
            ...noteData, 
            updated_at: new Date().toISOString()
        } as Note;
        setNotes(prev => prev.map(n => n.id === noteData.id ? optimisticUpdate : n));

        const { error: updateError } = await supabase
          .from('notes')
          .update({ 
            title: noteData.title, 
            content: noteData.content, // Ensure this handles rich text
            category: noteData.category 
          })
          .eq('id', noteData.id!);

        if (updateError) throw new Error(updateError.message);
        notify({ title: 'Idea Updated', variant: 'success' });

      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        const tempId = `temp-${Date.now()}`;
        const optimisticNote: Note = {
             id: tempId, 
             title: noteData.title || 'Untitled', 
             content: noteData.content || null, 
             category: noteData.category || 'Other',
             is_pinned: false, 
             created_at: new Date().toISOString(), 
             updated_at: new Date().toISOString(), 
             user_id: user.id 
        };
        setNotes(prev => [optimisticNote, ...prev]);

        const { data: insertedData, error: insertError } = await supabase
          .from('notes')
          .insert({ 
            user_id: user.id, 
            title: noteData.title, 
            content: noteData.content, 
            category: noteData.category,
            is_pinned: false 
          })
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

         if (insertedData) {
            setNotes(prev => prev.map(n => n.id === tempId ? insertedData : n));
        } else {
            await fetchNotes();
        }
        notify({ title: 'Idea Captured', variant: 'success' });
      }
      setIsModalOpen(false);
      setEditingNote(null);

    } catch (error: any) {
      console.error('Error saving note:', error.message);
      notify({ title: 'Error', description: `Could not save: ${error.message}`, variant: 'danger' });
      setNotes(originalNotes);
    }
  }, [supabase, notify, notes, fetchNotes]);

   const handleNoteAction = useCallback(async (id: string, action: 'pin' | 'delete') => {
    const originalNotes = [...notes];
    const noteToUpdate = originalNotes.find(n => n.id === id);
    if (!noteToUpdate) return;

    if (action === 'delete') {
        setNoteToDelete(id);
    } else if (action === 'pin') {
      const newPinnedState = !noteToUpdate.is_pinned;
      setNotes(prev => prev.map(note => note.id === id ? { ...note, is_pinned: newPinnedState } : note));
      try {
        const { error } = await supabase
          .from('notes')
          .update({ is_pinned: newPinnedState })
          .eq('id', id);
        if (error) throw new Error(error.message);
      } catch (error: any) {
        console.error('Error updating pin:', error.message);
        notify({ title: 'Error', description: 'Could not update pin status.', variant: 'danger' });
        setNotes(originalNotes);
      }
    }
  }, [supabase, notify, notes]);

   const handleConfirmDelete = useCallback(async () => {
        if (!noteToDelete) return;

        const originalNotes = [...notes];
        const tempNoteToDelete = noteToDelete;
        setNotes(prev => prev.filter(n => n.id !== tempNoteToDelete));
        setNoteToDelete(null);

        try {
            const { error } = await supabase.from('notes').delete().eq('id', tempNoteToDelete);
            if (error) throw new Error(error.message);
            notify({ title: 'Idea Deleted', variant: 'success' });
        } catch (error: any) {
            console.error('Error deleting:', error.message);
            notify({ title: 'Error', description: 'Could not delete idea.', variant: 'danger' });
            setNotes(originalNotes);
        }
    }, [supabase, notify, notes, noteToDelete]);

  return (
    <>
      <div className="min-h-full p-6 md:p-8 bg-[var(--bg-page)]">
        {/* Modern Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                <Lightbulb className="w-8 h-8 text-[var(--warning)] fill-[var(--warning)]/20" />
                Business & Marketing Ideas
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 text-sm md:text-base">
                Capture strategies, brainstorms, and future plans in one place
              </p>
            </div>
            <button
              onClick={handleNewNote}
              className="flex items-center justify-center bg-[var(--primary)] text-white px-5 py-2.5 rounded-[var(--radius-md)] font-semibold hover:bg-[var(--primary-600)] transition-all shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)]"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Idea
            </button>
          </div>

          {/* Filters & Search Bar - REMOVED BORDER */}
          <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-surface)] p-2 rounded-[var(--radius-lg)] shadow-sm">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            
            <div className="w-px bg-[var(--border-subtle)] hidden md:block mx-1" />

            <div className="flex items-center gap-2 overflow-x-auto px-2 pb-1 md:pb-0 no-scrollbar">
              <Filter className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              <button
                onClick={() => setFilterCategory('All')}
                className={clsx(
                  "whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  filterCategory === 'All' 
                    ? "bg-[var(--text-primary)] text-white" 
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                )}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={clsx(
                    "whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent",
                    filterCategory === cat 
                      ? "bg-[var(--bg-muted)] text-[var(--text-primary)] border-[var(--border)] shadow-sm" 
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-50" />
                <p className="text-sm font-medium">Loading your library...</p>
            </div>
          ) : sortedAndFilteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center px-4">
              <div className="bg-[var(--bg-surface)] p-4 rounded-full shadow-sm mb-4">
                <Feather className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">No ideas found</h3>
              <p className="text-[var(--text-secondary)] max-w-sm mx-auto text-sm">
                {searchTerm ? `No matches for "${searchTerm}"` : 'Start capturing your business strategies and marketing concepts today.'}
              </p>
              {!searchTerm && (
                <button onClick={handleNewNote} className="mt-6 text-[var(--primary)] text-sm font-medium hover:underline">
                  Create your first idea &rarr;
                </button>
              )}
            </div>
          ) : (
            <motion.div layout className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {sortedAndFilteredNotes.map(note => (
                  <IdeaCard key={note.id} note={note} onEdit={handleEditNote} onAction={handleNoteAction} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <NoteEditorModal
             isOpen={isModalOpen}
             initialData={editingNote}
             isEditing={!!editingNote}
             onSave={handleSaveNote}
             onClose={() => {
                setIsModalOpen(false);
                setEditingNote(null);
             }}
          />
        )}
      </AnimatePresence>

       <ConfirmDialog
            isOpen={!!noteToDelete}
            onClose={() => setNoteToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Delete Idea?"
        >
            Are you sure you want to delete this idea? This cannot be undone.
       </ConfirmDialog>
    </>
  );
}