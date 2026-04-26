import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestStepProgress, markQuestStep, unmarkQuestStep } from "@/lib/quest-progress";

export function useQuestStepProgress(questId: string) {
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(true);
  // Ref mirrors loadingStepId so toggleStep doesn't need it as a dep (avoids identity churn)
  const loadingStepIdRef = useRef<string | null>(null);

  const loadSteps = useCallback(async () => {
    const progress = await getQuestStepProgress(questId);
    if (!mountedRef.current) return;
    setCompletedStepIds(progress);
    setHydrated(true);
  }, [questId]);

  useEffect(() => {
    mountedRef.current = true;
    loadSteps();
    return () => { mountedRef.current = false; };
  }, [loadSteps]);

  const toggleStep = useCallback(async (stepId: string) => {
    if (loadingStepIdRef.current !== null) return;
    loadingStepIdRef.current = stepId;
    setLoadingStepId(stepId);

    let wasChecked = false;
    setCompletedStepIds((prev) => {
      wasChecked = prev.has(stepId);
      const next = new Set(prev);
      if (wasChecked) next.delete(stepId); else next.add(stepId);
      return next;
    });

    // wasChecked is captured synchronously inside the setState updater above
    const result = wasChecked
      ? await unmarkQuestStep(questId, stepId)
      : await markQuestStep(questId, stepId);

    if (!result.success) {
      setCompletedStepIds((prev) => {
        const next = new Set(prev);
        if (wasChecked) next.add(stepId); else next.delete(stepId);
        return next;
      });
    }

    loadingStepIdRef.current = null;
    if (mountedRef.current) setLoadingStepId(null);
  }, [questId]); // stable — completedStepIds read inside updater, loading guarded via ref

  return { completedStepIds, loadingStepId, hydrated, toggleStep };
}
