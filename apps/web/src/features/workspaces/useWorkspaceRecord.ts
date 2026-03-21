import { useCallback, useEffect, useState } from "react";
import type { WorkspaceDetail, WorkspaceStatus } from "./workspaceApi";
import {
  addWorkspaceTask,
  getWorkspace,
  toggleWorkspaceTask,
  updateWorkspaceStatus,
} from "./workspaceApi";

export function useWorkspaceRecord(workspaceId: string | null) {
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await getWorkspace(workspaceId);
      setDetail(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workspace.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveStatus = useCallback(async (status: WorkspaceStatus) => {
    if (!workspaceId || !detail) return;
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
      const next = await updateWorkspaceStatus(workspaceId, status);
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
      setError(e instanceof Error ? e.message : "Unable to update workspace status.");
    } finally {
      setSavingStatus(false);
    }
  }, [detail, workspaceId]);

  const addTask = useCallback(async (label: string) => {
    if (!workspaceId || !label.trim()) return;
    setSavingTask(true);
    setError(null);
    try {
      const task = await addWorkspaceTask(workspaceId, label.trim());
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
  }, [workspaceId]);

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
      const task = await toggleWorkspaceTask(taskId);
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
