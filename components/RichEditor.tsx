'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Heading1, Heading2, Heading3 } from 'lucide-react';

interface RichEditorProps {
  initialContent?: string;
  onUpdate: (htmlContent: string) => void;
  editable?: boolean;
  editorClass?: string;
  placeholderText?: string;
}

// --- Floating Toolbar Sub-Component (Accepts 'editable' prop) ---
const FloatingToolbar = ({ editor, editable }: { editor: Editor | null; editable: boolean }) => {
  // Show toolbar only if editor exists, IS editable, and has focus or selection
  if (!editor || !editable || (!editor.isFocused && editor.state.selection.empty)) {
    return null;
  }

  const items = [
    { icon: 'Heading1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { icon: 'Heading2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { icon: 'Heading3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    { icon: 'Bold', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike') },
    { icon: 'Code', action: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive('code') },
    { icon: 'Highlight', action: () => editor.chain().focus().toggleHighlight({ color: 'var(--highlight-color, color-mix(in srgb, var(--warning) 30%, transparent))' }).run(), isActive: editor.isActive('highlight') },
    { icon: 'ListOrdered', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { icon: 'ListUnordered', action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
  ];

  const IconComponent = ({ name }: { name: string }) => {
    const size = 16;
    const className = `w-4 h-4`;
    switch (name) {
      case 'Heading1': return <Heading1 size={size} />;
      case 'Heading2': return <Heading2 size={size} />;
      case 'Heading3': return <Heading3 size={size} />;
      case 'Bold':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>;
      case 'Italic':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>;
      case 'Strikethrough':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"></path><path d="M16 6V3a3 3 0 0 0-6 0v3"></path><path d="M16 18v3a3 3 0 0 1-6 0v-3"></path></svg>;
      case 'Code':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
      case 'Highlight':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 5l-2.028 2.028a.5.5 0 0 1-.354.146h-1.296a.5.5 0 0 1-.354-.146L9 5"></path><path d="M18.835 15.655a.5.5 0 0 0-.075.05L12 21 5.24 15.705a.5.5 0 0 0-.075-.05c-.15-.125-.24-.315-.24-.52V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9.135c0 .205-.09.4-.24.52z"></path></svg>;
      case 'ListOrdered':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1.5l.5-1.5-.5-1.5H4z"></path><path d="M3 12h2"></path><path d="M4 18h1.5l.5-1.5-.5-1.5H4z"></path></svg>;
      case 'ListUnordered':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
      default:
        return null;
    }
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 -top-12 flex space-x-1 p-1 bg-[var(--sidebar-bg)] shadow-lg rounded-lg border-2 border-white/10 backdrop-blur-sm z-10">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.action}
          className={`p-2 rounded-md transition-colors ${item.isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--sidebar-text)] hover:bg-[var(--primary)]/50'}`}
          type="button"
        >
          <IconComponent name={item.icon} />
        </button>
      ))}
    </div>
  );
};

// --- Main RichEditor Component ---
const RichEditor: React.FC<RichEditorProps> = ({
  initialContent = '',
  onUpdate,
  editable = true, // Default editable to true
  editorClass = '',
  placeholderText = 'Start writing...'
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: true,
        codeBlock: false,
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: { style: 'background-color: color-mix(in srgb, var(--warning) 30%, transparent)' },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Write a compelling subheading here';
          }
          return placeholderText;
        },
      }),
    ],
    content: initialContent,
    editable: editable, // Pass editable state to the editor instance
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base focus:outline-none font-roboto-mono p-4 h-full overflow-y-auto prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-a:text-[var(--primary)] prose-code:text-[var(--text-secondary)] prose-code:bg-[var(--bg-muted)] prose-li:text-[var(--text-primary)] ${editorClass}`,
        style: 'min-height: 200px;'
      },
    },
  });

  // Effect to update editor content if initialContent prop changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const editorContent = editor.getHTML();
      if (initialContent !== editorContent) {
        editor.commands.setContent(initialContent, false);
      }
      // Sync editable state if the prop changes
      if (editor.isEditable !== editable) {
        editor.setEditable(editable);
      }
    }
  }, [initialContent, editable, editor]);

  // Effect to destroy editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative">
      {/* Pass the 'editable' prop down to FloatingToolbar */}
      <FloatingToolbar editor={editor} editable={editable} />

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichEditor;