"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

export interface ToastItem {
  id: number;
  message: string;
}

interface ToastProps {
  items: ToastItem[];
  onRemove: (id: number) => void;
}

function ToastEntry({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: number) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 2200);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  return <div className={styles.toast}>{item.message}</div>;
}

export default function Toast({ items, onRemove }: ToastProps) {
  return (
    <div className={styles.stack}>
      {items.map((t) => (
        <ToastEntry key={t.id} item={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
