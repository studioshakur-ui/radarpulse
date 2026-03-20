import { useCallback, useEffect, useState } from "react";
import type { DossierStatus } from "@/lib/types";
import {
  addDossierTask,
  getDossier,
  toggleDossierTask,
  updateDossierStatus,
  type DossierDetail,
} from "./dossierApi";

export function useDossier(dossierId: string | null) {
  const [detail, setDetail] = useState<DossierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!dossierId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await getDossier(dossierId);
      setDetail(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load dossier.");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveStatus = useCallback(async (status: DossierStatus) => {
    if (!dossierId || !detail) return;
    setSavingStatus(true);
    setError(null);
    const previous = detail;
    setDetail({
      ...detail,
      dossier: {
        ...detail.dossier,
        status,
      },
    });

    try {
      const next = await updateDossierStatus(dossierId, status);
      setDetail((current) => (
        current
          ? {
              ...current,
              dossier: next,
            }
          : current
      ));
    } catch (e) {
      setDetail(previous);
      setError(e instanceof Error ? e.message : "Unable to update dossier status.");
    } finally {
      setSavingStatus(false);
    }
  }, [detail, dossierId]);

  const addTask = useCallback(async (label: string) => {
    if (!dossierId || !label.trim()) return;
    setSavingTask(true);
    setError(null);
    try {
      const task = await addDossierTask(dossierId, label.trim());
      setDetail((current) => (
        current
          ? {
              ...current,
              tasks: [...current.tasks, task],
            }
          : current
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add task.");
      throw e;
    } finally {
      setSavingTask(false);
    }
  }, [dossierId]);

  const toggleTask = useCallback(async (taskId: string) => {
    if (!detail) return;
    setSavingTask(true);
    setError(null);
    const previous = detail.tasks;
    setDetail({
      ...detail,
      tasks: detail.tasks.map((task) => (
        task.id === taskId
          ? { ...task, is_done: !task.is_done }
          : task
      )),
    });

    try {
      const task = await toggleDossierTask(taskId);
      setDetail((current) => (
        current
          ? {
              ...current,
              tasks: current.tasks.map((row) => (row.id === task.id ? task : row)),
            }
          : current
      ));
    } catch (e) {
      setDetail((current) => (
        current
          ? {
              ...current,
              tasks: previous,
            }
          : current
      ));
      setError(e instanceof Error ? e.message : "Unable to update task.");
    } finally {
      setSavingTask(false);
    }
  }, [detail]);

  return {
    detail,
    loading,
    savingStatus,
    savingTask,
    error,
    reload,
    saveStatus,
    addTask,
    toggleTask,
  };
}
