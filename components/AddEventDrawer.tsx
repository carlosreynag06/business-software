'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- UPDATED Type definition (remains the same structurally) ---
export type CreateEventPayload = {
  // id?: string; // ID might be needed for updates, depending on how server action is structured
  title: string;
  start_local: string;     // local "YYYY-MM-DDTHH:mm" from <input type="datetime-local">
  end_local?: string | null;    // optional local "YYYY-MM-DDTHH:mm"
  category: string;
  status: string;         // NOTE: must match server enum ('scheduled' or 'done')
  kind: string;           // NOTE: must match server enum ('task' or 'event')
  world: 'Business' | 'Personal'; // required by API
  all_day: boolean;         // required by API
  location?: string | null;     // --- ADDED ---
  notes?: string | null;        // --- ADDED ---
};

// --- UPDATED Props ---
type EventDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  // Renamed onCreate to onSave for clarity, handles both create/update
  onSave: (payload: CreateEventPayload) => Promise<void>;
  // NEW: Flag for edit mode
  isEditing?: boolean;
  // NEW: Initial data for editing
  initialData?: Partial<CreateEventPayload & { id?: string }>; // Allow partial data for form population
};
// --- END UPDATE ---

// --- UPDATED Component Signature ---
export default function AddEventDrawer({
    isOpen,
    onClose,
    onSave, // Use onSave prop
    isEditing = false, // Default to false
    initialData
}: EventDrawerProps) {
// --- END UPDATE ---

  const inputClasses =
    "block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30";

  // Controlled form state
  const [title, setTitle] = React.useState<string>('');
  const [allDay, setAllDay] = React.useState<boolean>(false);
  const [startLocal, setStartLocal] = React.useState<string>(''); // "YYYY-MM-DDTHH:mm"
  const [endLocal, setEndLocal] = React.useState<string>('');     // "YYYY-MM-DDTHH:mm"
  const [category, setCategory] = React.useState<string>('Personal');
  const [location, setLocation] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  // --- NEW: Store kind and status if passed in initialData ---
  const [kind, setKind] = React.useState<string>('event');
  const [status, setStatus] = React.useState<string>('scheduled');
  // --- END NEW ---

  // --- NEW: Effect to pre-fill form when editing ---
  React.useEffect(() => {
    if (isOpen && isEditing && initialData) {
      setTitle(initialData.title || '');
      setAllDay(initialData.all_day || false);
      setStartLocal(initialData.start_local || '');
      setEndLocal(initialData.end_local || '');
      // --- Map DB category 'Work' back to form 'Business' ---
      let formCategory = initialData.category || 'Personal';
      if (formCategory === 'Work') formCategory = 'Business';
      // Handle potential Recreation -> Other mapping if needed on load, though saving handles it
      setCategory(formCategory);
      // --- END Map ---
      setLocation(initialData.location || '');
      setNotes(initialData.notes || '');
      // --- NEW: Set kind and status from initial data if available ---
      setKind(initialData.kind || 'event');
      setStatus(initialData.status || 'scheduled');
      // --- END NEW ---
    } else if (isOpen && !isEditing) {
      // Reset form when opening in 'Add' mode
      setTitle('');
      setAllDay(false);
      setStartLocal('');
      setEndLocal('');
      setCategory('Personal');
      setLocation('');
      setNotes('');
      setKind('event'); // Reset kind
      setStatus('scheduled'); // Reset status
    }
  }, [isOpen, isEditing, initialData]);
  // --- END NEW ---


  // Effect to manage end time based on allDay (Unchanged)
  React.useEffect(() => {
    // Only adjust end time if start time exists and it's an all-day event
    if (allDay && startLocal) {
        const [datePart] = startLocal.split('T'); // Get just the date part
        // Set end time to 23:59 on the *same day* as startLocal date part
        const potentialEndLocal = `${datePart}T23:59`;
        // Only update if it's different to avoid infinite loops
        if (endLocal !== potentialEndLocal) {
            setEndLocal(potentialEndLocal);
        }
    }
    // Removed the logic that clears endLocal when unchecking allDay,
    // as it might be confusing if the user explicitly set an end time.
  }, [allDay, startLocal, endLocal]); // Added endLocal dependency


  // --- UPDATED handleSubmit ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title || !startLocal) {
      console.error("Title and Start Time are required.");
      // TODO: Add user feedback (e.g., using useToast)
      return;
    }

    // Logic to derive world and map category (remains the same)
    const derivedWorld = (category === 'Business') ? 'Business' : 'Personal';
    let apiCategory = category;
    if (category === 'Business') apiCategory = 'Work';
    if (category === 'Recreation') apiCategory = 'Other';

    // Construct payload (remains the same structure)
    const payload: CreateEventPayload = {
      // id: isEditing ? initialData?.id : undefined, // Include ID only if editing AND server action needs it
      title: title.trim(),
      start_local: startLocal,
      end_local: (endLocal && !allDay) ? endLocal : null, // Ensure end_local is null if allDay is checked
      category: apiCategory,
      // Use state for status and kind, falling back to defaults
      status: status || 'scheduled',
      kind: kind || 'event',
      world: derivedWorld,
      all_day: allDay,
      location: location.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setIsSubmitting(true);
      // Call the single onSave handler passed from the parent
      await onSave(payload);

      // Parent component (CalendarPage) handles closing and resetting state after successful save
      // No need to reset form here as useEffect handles it based on isOpen/isEditing

    } catch (error) {
        console.error(`Error during ${isEditing ? 'onSave (edit)' : 'onSave (create)'}:`, error);
        // Parent component (CalendarPage) should show error notifications via useToast
    }
    finally {
      // Always set submitting to false, even if parent handles closing
      setIsSubmitting(false);
    }
  }

  // --- NEW: Dynamic Title and Button Text ---
  const drawerTitle = isEditing ? "Edit Event" : "Add Event";
  const saveButtonText = isEditing ? "Save Changes" : "Save Event";
  // --- END NEW ---


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000]" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={onClose} // Use onClose prop directly
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="pointer-events-auto w-screen max-w-md"
            >
              <div className="flex h-full flex-col overflow-y-scroll bg-[var(--bg-surface)] shadow-[var(--shadow-3)]">
                <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-start justify-between">
                    {/* --- Use dynamic title --- */}
                    <h2 id="slide-over-title" className="text-[var(--fs-h3)] font-semibold">
                      {drawerTitle}
                    </h2>
                    {/* --- END --- */}
                    <button
                      onClick={onClose} // Use onClose prop directly
                      aria-label="Close"
                      className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 px-6 py-6">
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {/* Event Title (Required) */}
                    <div>
                      <label htmlFor="event-title" className="mb-1 block text-sm font-medium">Event Title</label>
                      <input
                        type="text"
                        id="event-title"
                        required
                        placeholder="e.g., Dentist Appointment"
                        className={inputClasses}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* All Day Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        id="all-day"
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="all-day" className="text-sm font-medium">All-day event</label>
                    </div>

                    {/* Start/End Time Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Start Time */}
                      <div>
                        <label htmlFor="start-time" className="mb-1 block text-sm font-medium">Start Time</label>
                        <input
                          type="datetime-local"
                          id="start-time"
                          required
                          className={inputClasses}
                          value={startLocal}
                          onChange={(e) => setStartLocal(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      {/* End Time */}
                      <div>
                        <label htmlFor="end-time" className="mb-1 block text-sm font-medium">End Time</label>
                        <input
                          type="datetime-local"
                          id="end-time"
                          className={inputClasses}
                          value={endLocal}
                          onChange={(e) => setEndLocal(e.target.value)}
                          // Disable end time input if allDay is checked
                          disabled={isSubmitting || allDay}
                          min={startLocal || undefined} // Prevent end time before start time
                        />
                      </div>
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label htmlFor="category" className="mb-1 block text-sm font-medium">Category</label>
                      <select
                        id="category"
                        className={inputClasses}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option>Business</option>
                        <option>Personal</option>
                        <option>Health</option>
                        <option>Errand</option>
                        <option>Recreation</option>
                        <option>Other</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div>
                      <label htmlFor="location" className="mb-1 block text-sm font-medium">Location</label>
                      <input
                        type="text"
                        id="location"
                        placeholder="e.g., 123 Main St"
                        className={inputClasses}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
                      <textarea
                        id="notes"
                        rows={4}
                        className="block w-full rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose} // Use onClose prop directly
                        className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)] disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                      >
                        {/* --- Use dynamic button text --- */}
                        {isSubmitting ? 'Saving...' : saveButtonText}
                        {/* --- END --- */}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
