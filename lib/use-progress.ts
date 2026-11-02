import { useCallback, useEffect, useRef, useState } from "react";
import { emptyProgress, type Progress } from "./progress";
import { deviceId, loadProgress, persist, storageWorks } from "./storage";
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress),
    ref = useRef(progress);
  const [ready, setReady] = useState(false),
    [device, setDevice] = useState(""),
    [canSave, setCanSave] = useState(true);
  const commit = useCallback(
    (next: Progress | ((old: Progress) => Progress)) => {
      const value = typeof next === "function" ? next(ref.current) : next;
      ref.current = value;
      void persist(value).then(setCanSave);
      setProgress(value);
    },
    [],
  );
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const loaded = await loadProgress(),
        works = await storageWorks();
      if (!mounted) return;
      ref.current = loaded;
      setProgress(loaded);
      setDevice(deviceId());
      setCanSave(works);
      setReady(true);
      if (navigator.storage?.persist)
        void navigator.storage.persist().catch(() => {});
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return { progress, commit, progressRef: ref, ready, device, canSave };
}
