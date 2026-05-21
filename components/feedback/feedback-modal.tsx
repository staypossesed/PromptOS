"use client";

import { useState } from "react";
import { X, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { useTranslations } from "@/lib/i18n/use-translations";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  page?: string;
}

export function FeedbackModal({ open, onClose, page }: FeedbackModalProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        message: message.trim(),
        page: page ?? null,
      });
      if (dbError) throw dbError;
      track("feedback_submitted");
      setDone(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feedback.failed"));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setDone(false);
    setError(null);
    setMessage("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="rounded-2xl border border-ink-100/80 bg-white shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="size-4 text-clay-600" />
                  <h2 className="text-sm font-semibold text-ink-900">{t("feedback.title")}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 -mr-1 -mt-1"
                  onClick={handleClose}
                  aria-label={t("common.close")}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {done ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle2 className="size-8 text-sage-600" />
                  <p className="text-sm font-medium text-ink-800">{t("feedback.successTitle")}</p>
                  <p className="text-xs text-ink-400">{t("feedback.successSubtitle")}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={handleClose}>
                    {t("feedback.close")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    placeholder={t("feedback.placeholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    disabled={loading}
                    autoFocus
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-ink-300">{message.length}/2000</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                        {t("feedback.cancel")}
                      </Button>
                      <Button type="submit" size="sm" disabled={loading || !message.trim()}>
                        {loading && <Loader2 className="size-3.5 animate-spin" />}
                        {loading ? t("feedback.sending") : t("feedback.send")}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
