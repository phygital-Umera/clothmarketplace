import {useState} from 'react';

/**
 * Add / edit form shown on the list page itself (one page per master):
 * `editing` is 'new', the id being edited, or null when the form is closed.
 */
const useInlineEditor = (openOnStart = false) => {
  const [editing, setEditing] = useState<string | null>(
    openOnStart ? 'new' : null,
  );
  const open = (id: string) => {
    setEditing(id);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
  return {
    editing,
    /** id to edit, or undefined when adding */
    editId: editing && editing !== 'new' ? editing : undefined,
    openNew: () => open('new'),
    openEdit: (id: string) => open(id),
    close: () => setEditing(null),
  };
};

export default useInlineEditor;
