import { ArrowLeft } from 'lucide-react';

const tips = [
  { emoji: '🔄', text: 'Hold any transaction → delete option appears' },
  { emoji: '☑️', text: 'Hold multiple transactions → shows combined total' },
  { emoji: '✏️', text: 'Tap edit icon → edit that transaction' },
  { emoji: '💰', text: 'UPI/Cash cards on home → filters by payment method' },
  { emoji: '📊', text: 'Breakdown tabs → switch Daily/Weekly/Monthly/Yearly' },
  { emoji: '🔍', text: 'Search bar → search by name, category, amount' },
  { emoji: '📥', text: 'Download Statement → export as PDF' },
  { emoji: '🗑️', text: 'Deleted History → restore within 30 days' },
];

interface HelpViewProps {
  onBack: () => void;
}

const HelpView = ({ onBack }: HelpViewProps) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold text-foreground">Help & Guide</h2>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3.5 p-4 rounded-2xl bg-card border border-border/50">
            <span className="text-2xl leading-none mt-0.5">{tip.emoji}</span>
            <p className="text-sm text-foreground font-medium leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpView;
