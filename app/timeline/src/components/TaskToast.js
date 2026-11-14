import React, { useEffect, useRef, useState } from "react";

const TOAST_MS = 2400;
// A sentence of detail needs longer to read than a short label.
const TOAST_DETAIL_MS = 4200;

/**
 * One-at-a-time card over the live screen. A new task replaces the current
 * one and restarts the timer, long enough to read a short label.
 */
function TaskToast({ toast }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!toast?.id) return undefined;
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), toast.detail ? TOAST_DETAIL_MS : TOAST_MS);
    return () => clearTimeout(timerRef.current);
  }, [toast?.id]);

  if (!toast || !visible) return null;

  return (
    <div key={toast.id} className="tl-task-toast" role="status">
      <span className="tl-task-toast__dot" aria-hidden="true" />
      <span className="tl-task-toast__label">Task</span>
      <span className="tl-task-toast__body">
        <span className="tl-task-toast__text">{toast.summary}</span>
        {toast.detail ? <span className="tl-task-toast__detail">{toast.detail}</span> : null}
      </span>
      {toast.application ? <span className="tl-task-toast__app">{toast.application}</span> : null}
    </div>
  );
}

export default TaskToast;
