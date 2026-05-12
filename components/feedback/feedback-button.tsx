"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/feedback/feedback-modal";

interface FeedbackButtonProps {
  page?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export function FeedbackButton({
  page,
  variant = "outline",
  size = "sm",
  label = "Send feedback",
}: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" />
        {label}
      </Button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} page={page} />
    </>
  );
}
