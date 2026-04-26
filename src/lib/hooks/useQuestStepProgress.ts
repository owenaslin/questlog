import { useCallback, useEffect, useRef, useState } from "react";
import { getQuestStepProgress, markQuestStep, unmarkQuestStep } from "@/lib/quest-progress";

export function useQuestStepProgress(questId: string) {
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const mountedRef = useRef(true);

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
    if (loadingStepId !== null) return;
    setLoadingStepId(stepId);
    const wasChecked = completedStepIds.has(stepId);
    setCompletedStepIds((prev) => {
      const next = new Set(prev);
      if (wasChecked) next.delete(stepId); else next.add(stepId);
      return next;
    });
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
    if (mountedRef.current) setLoadingStepId(null);
  }, [questId, completedStepIds, loadingStepId]);

  return { completedStepIds, loadingStepId, hydrated, toggleStep };
}
