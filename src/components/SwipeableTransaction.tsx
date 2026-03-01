import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableTransactionProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const SwipeableTransaction = ({ children, onDelete }: SwipeableTransactionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    // Only allow swiping left (positive diff)
    const clampedOffset = Math.max(0, Math.min(diff, 120));
    setOffset(clampedOffset);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (offset >= threshold) {
      // Animate out then delete
      setOffset(300);
      setTimeout(onDelete, 200);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <div className="absolute inset-0 flex items-center justify-end px-6 bg-destructive/20 rounded-2xl">
        <Trash2 size={20} className="text-destructive" />
      </div>
      {/* Swipeable content */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease-out',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableTransaction;
