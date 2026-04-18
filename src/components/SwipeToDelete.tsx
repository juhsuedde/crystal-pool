import { ReactNode, useRef, useState, TouchEvent, PointerEvent } from "react";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

const ACTION_WIDTH = 88;

const SwipeToDelete = ({ children, onDelete, threshold = 60 }: Props) => {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const startedSwipe = useRef(false);

  const onStart = (clientX: number) => {
    startX.current = clientX;
    startedSwipe.current = false;
  };

  const onMove = (clientX: number) => {
    if (startX.current == null) return;
    const dx = clientX - startX.current;
    // Only react to leftward swipes (negative dx)
    if (Math.abs(dx) > 8) startedSwipe.current = true;
    const base = open ? -ACTION_WIDTH : 0;
    let next = base + dx;
    if (next > 0) next = 0;
    if (next < -ACTION_WIDTH * 1.3) next = -ACTION_WIDTH * 1.3;
    setOffset(next);
  };

  const onEnd = () => {
    if (startX.current == null) return;
    startX.current = null;
    if (offset < -threshold) {
      setOffset(-ACTION_WIDTH);
      setOpen(true);
    } else {
      setOffset(0);
      setOpen(false);
    }
  };

  const handleTouchStart = (e: TouchEvent) => onStart(e.touches[0].clientX);
  const handleTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
  const handleTouchEnd = () => onEnd();

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") return; // touch already handled
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onStart(e.clientX);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (startX.current == null) return;
    onMove(e.clientX);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    onEnd();
  };

  // Intercept clicks on inner card if user just swiped
  const handleClickCapture = (e: React.MouseEvent) => {
    if (startedSwipe.current || open) {
      e.preventDefault();
      e.stopPropagation();
      // Tapping outside while open closes
      if (open) {
        setOffset(0);
        setOpen(false);
      }
      startedSwipe.current = false;
    }
  };

  const handleDelete = () => {
    setOpen(false);
    setOffset(0);
    onDelete();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background delete action */}
      <button
        type="button"
        onClick={handleDelete}
        aria-label={t("common.delete")}
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground"
        style={{ width: ACTION_WIDTH }}
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 className="w-5 h-5" />
          <span className="text-[11px] font-semibold">{t("poolCard.deleteAction")}</span>
        </div>
      </button>

      <div
        className={cn("relative touch-pan-y", offset === 0 ? "transition-transform duration-200" : "")}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeToDelete;
