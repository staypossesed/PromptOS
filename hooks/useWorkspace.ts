"use client";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceInput, WorkspaceItem } from "@/lib/workspace";

export function useWorkspace() {
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace", { signal });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not load the library.");
      setItems(json.data); setError("");
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Could not load the library.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);
  async function save(input: WorkspaceInput, id?: string) {
    const response = await fetch(`/api/workspace${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
      method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not save.");
    setItems((old) => [json.data, ...old.filter((item) => item.id !== json.data.id)]);
    return json.data as WorkspaceItem;
  }
  async function remove(id: string) {
    const response = await fetch(`/api/workspace?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Could not delete.");
    setItems((old) => old.filter((item) => item.id !== id));
  }
  return { items, loading, error, refresh, save, remove };
}
