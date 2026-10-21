"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/system/dialog";
import { Button } from "@/components/system/button";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

export function FeedbackDialog({ page = "/help", label = "Send feedback" }: { page?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        message: message.trim(),
        page,
      });
      if (dbError) throw dbError;
      track("feedback_submitted");
      setDone(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setDone(false); setError(null); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">{label}</Button>
      </DialogTrigger>
      <DialogContent title={done ? "Thank you." : "Send feedback."} description={done ? "The note is in the feedback table." : "What is missing, confusing, or broken? No prompt content, please."}>
        {done ? (
          <Button size="sm" onClick={() => setOpen(false)}>Close</Button>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label className="field__label" htmlFor="feedback-message">Message</label>
            <textarea
              id="feedback-message"
              className="field__textarea"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="A sentence is enough."
              autoFocus
            />
            {error ? <p className="field__error">{error}</p> : null}
            <div className="composer__actions">
              <Button type="submit" variant="accent" disabled={loading || !message.trim()}>
                {loading ? "Sending" : "Send"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
