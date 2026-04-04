"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_CHAT_WEBHOOK_URL;
      if (!webhookUrl || webhookUrl === "placeholder_webhook_url") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Chat agent is not configured yet. Check back soon!",
          },
        ]);
        return;
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || data.output || "No response received." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-col" style={{ maxHeight: "400px" }}>
      <h3 className="heading-display text-xl mb-4">Ask Me Anything</h3>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[120px]">
        {messages.length === 0 && (
          <p className="text-sm text-text-secondary">
            Ask about my experience, projects, or anything else...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-[rgba(59,130,246,0.1)] text-text-secondary"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[rgba(59,130,246,0.1)] px-3 py-2 rounded-lg text-sm text-text-secondary">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[rgba(5,10,20,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:transform-none"
        >
          Send
        </button>
      </form>
    </div>
  );
}
