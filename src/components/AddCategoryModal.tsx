import { useState } from 'react';
import { X } from 'lucide-react';
import { addCustomCategory } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

const EMOJI_OPTIONS = ['🏠', '✈️', '🎓', '🐾', '💅', '🍕', '☕', '🎁', '🔧', '📚', '🎵', '⚽', '🧹', '👶', '💍', '🚀', '🎨', '🌱'];
const COLOR_OPTIONS = ['#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#10B981', '#8B5CF6', '#06B6D4', '#F97316', '#6B7280', '#D946EF', '#14B8A6', '#F43F5E'];

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const AddCategoryModal = ({ onClose, onAdded }: Props) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Enter a category name', variant: 'destructive' });
      return;
    }
    addCustomCategory({ name: name.trim(), emoji, color });
    toast({ title: `"${name}" category added!` });
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[90%] max-w-sm bg-card rounded-3xl border border-border/50 p-6 animate-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-black text-foreground">New Category</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl" style={{ backgroundColor: color + '20' }}>
            {emoji}
          </div>
        </div>

        {/* Name */}
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Category name"
          maxLength={12}
          className="w-full px-5 py-3.5 rounded-3xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm mb-4"
          autoFocus
        />

        {/* Emoji Picker */}
        <p className="text-xs font-semibold text-muted-foreground mb-2">Icon</p>
        <div className="grid grid-cols-9 gap-1.5 mb-4">
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`text-xl p-1.5 rounded-2xl transition-all active:scale-95 ${emoji === e ? 'bg-primary/20 border border-primary/50' : 'bg-secondary'}`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <p className="text-xs font-semibold text-muted-foreground mb-2">Color</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all active:scale-95 ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-3xl gradient-primary text-primary-foreground font-bold text-sm active:scale-95 transition-all glow-primary"
        >
          Create Category
        </button>
      </div>
    </div>
  );
};

export default AddCategoryModal;
