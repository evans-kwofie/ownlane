"use client";

import { FormEvent, useState } from "react";

const creatorTypes = ["Photographer", "Content creator", "Educator", "Coach or consultant", "Artist or designer", "Community builder", "Other"];

export function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), name: form.get("name"), creatorType: form.get("creatorType"), company: form.get("company") }),
      });
      const responseBody = await response.text();
      let result: { error?: string } = {};
      if (responseBody) {
        try { result = JSON.parse(responseBody) as { error?: string }; } catch { result = {}; }
      }
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setStatus("success");
      setMessage("You are on the list. We will be in touch.");
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return <form className="mx-auto mt-9 max-w-xl text-left" onSubmit={handleSubmit}>
    <label className="sr-only" htmlFor="waitlist-email">Email address</label>
    <input aria-describedby="waitlist-status" className="min-h-14 w-full border border-black bg-white px-4 text-base text-black outline-none placeholder:text-black/45 focus:border-[#ff4d00]" disabled={status === "loading" || status === "success"} id="waitlist-email" name="email" placeholder="you@example.com" required type="email" />
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><input className="min-h-12 border border-black/35 bg-white px-4 text-sm text-black outline-none placeholder:text-black/45 focus:border-[#ff4d00]" disabled={status === "loading" || status === "success"} name="name" placeholder="Name (optional)" type="text" /><select className="min-h-12 border border-black/35 bg-white px-4 text-sm text-black outline-none focus:border-[#ff4d00]" defaultValue="" disabled={status === "loading" || status === "success"} name="creatorType"><option value="">What do you make? (optional)</option>{creatorTypes.map((creatorType) => <option key={creatorType} value={creatorType}>{creatorType}</option>)}</select></div>
    <button className="button-pour mt-3 flex min-h-14 w-full items-center justify-center bg-[#ff4d00] px-6 text-sm font-bold uppercase tracking-[0.1em] text-black [--button-fill:#000000] hover:text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={status === "loading" || status === "success"} type="submit"><span>{status === "loading" ? "Saving..." : status === "success" ? "You are in" : "Join early"}</span></button>
    <input aria-hidden="true" autoComplete="off" className="hidden" name="company" tabIndex={-1} type="text" />
    <p aria-live="polite" className={status === "error" ? "mt-3 text-sm text-red-700" : "mt-3 text-sm text-black/60"} id="waitlist-status">{message || "No spam. Just a note when Ownlane is ready for you."}</p>
  </form>;
}
