import { useState } from 'react';
import { useCustomCategories } from '@/lib/store';
import { ArrowLeft, Tag, Pencil, Plus } from 'lucide-react';
import EditCategoryModal from '@/components/EditCategoryModal';
import AddCategoryModal from '@/components/AddCategoryModal';

interface CategoriesSectionProps {
  onBack: () => void;
}

const CategoriesSection = ({ onBack }: CategoriesSectionProps) => {
  const { data: customCategories = [] } = useCustomCategories();
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; emoji: string; color: string; type?: string } | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">My Categories</h2>
      </div>

      <div className="rounded-xl bg-card p-5 border border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Tag size={18} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest flex-1">My Categories</h3>
          <button onClick={() => setShowAddCategory(true)} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all">
            <Plus size={16} className="text-primary" />
          </button>
        </div>
        {customCategories.length > 0 ? (
          <div className="space-y-2">
            {customCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-secondary">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + '20' }}>
                  {cat.emoji}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                <button onClick={() => setEditingCategory({ id: cat.id, name: cat.name, emoji: cat.emoji, color: cat.color, type: (cat as any).type || 'both' })} className="p-1.5 rounded-lg bg-card hover:bg-card/80 active:scale-95 transition-all">
                  <Pencil size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No custom categories yet. Tap + to add one.</p>
        )}
      </div>

      {editingCategory && <EditCategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} />}
      {showAddCategory && <AddCategoryModal onClose={() => setShowAddCategory(false)} />}
    </div>
  );
};

export default CategoriesSection;
