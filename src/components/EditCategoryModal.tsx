import { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useUpdateCustomCategory, useDeleteCustomCategory } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditCategoryModalProps {
  category: { id: string; name: string; emoji: string; color: string };
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🍔', '🚗', '🛍️', '📱', '💊', '🎮', '💰', '💻', '📈', '📦', '🏠', '✈️', '🎬', '📚', '🎵', '🐶', '⚽', '🎁', '💎', '🧹', '🍕', '☕', '🏋️', '👕', '💇', '🔧', '🎓', '🏥', '🚌', '🎭'];

const COLOR_OPTIONS = [
  '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#10B981',
  '#8B5CF6', '#06B6D4', '#F97316', '#6B7280', '#D946EF',
  '#14B8A6', '#E11D48', '#7C3AED', '#2563EB', '#CA8A04',
];

const EditCategoryModal = ({ category, onClose }: EditCategoryModalProps) => {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [color, setColor] = useState(category.color);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const updateCategory = useUpdateCustomCategory();
  const deleteCategory = useDeleteCustomCategory();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Category name is required', variant: 'destructive' });
      return;
    }
    try {
      await updateCategory.mutateAsync({ id: category.id, name: name.trim(), emoji, color });
      toast({ title: 'Category updated!' });
      onClose();
    } catch {
      toast({ title: 'Error updating category', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory.mutateAsync(category.name);
      toast({ title: 'Category deleted' });
      onClose();
    } catch {
      toast({ title: 'Error deleting category', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-lg bg-card rounded-t-3xl border border-border/50 p-6 pb-10 animate-in" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Edit Category</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full bg-destructive/10 active:scale-95 transition-all">
                <Trash2 size={18} className="text-destructive" />
              </button>
              <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2" style={{ backgroundColor: color + '20' }}>
              {emoji}
            </div>
            <p className="text-sm font-semibold text-foreground">{name || 'Category'}</p>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-secondary text-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm"
            />
          </div>

          {/* Emoji Picker */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Emoji</label>
            <div className="grid grid-cols-10 gap-1.5 max-h-24 overflow-y-auto">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all active:scale-90 ${emoji === e ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-6">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all active:scale-90 ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateCategory.isPending}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-base active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            <Save size={18} />
            {updateCategory.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>This will remove "{category.name}" from your categories. Existing transactions won't be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditCategoryModal;
