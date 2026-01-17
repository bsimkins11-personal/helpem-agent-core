"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "How does HelpEm work?",
    "What are the pricing plans?",
    "How do I create a todo or appointment?",
    "What's the difference between Basic and Premium?",
    "Can I use voice input on the web app?",
    "How does team collaboration work?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Reset conversation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const resetTime = data.resetAt ? new Date(data.resetAt).toLocaleTimeString() : "a few minutes";
          const errorMessage: Message = {
            role: "assistant",
            content: `I've received a lot of questions recently! Please try again after ${resetTime}. For urgent help, email support@helpem.ai`,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again or email us at support@helpem.ai",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-xl">
              💬
            </div>
            <div>
              <h2 className="text-lg font-bold text-brandText">HelpEm Support</h2>
              <p className="text-sm text-brandTextLight">Ask us anything!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close support"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-brandTextLight mb-6">
                Choose a question below or ask your own!
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-left p-3 rounded-xl border-2 border-gray-200 hover:border-brandBlue hover:bg-brandBlue/5 transition-all"
                  >
                    <span className="text-xs sm:text-sm text-brandText font-medium">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-brandBlue to-brandGreen text-white"
                        : "bg-gray-100 text-brandText"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brandBlue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-brandBlue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-brandBlue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:border-brandBlue focus:ring-2 focus:ring-brandBlue/20 outline-none transition-all disabled:bg-gray-100 text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-brandTextLight mt-2 text-center">
            Need direct help? Email{" "}
            <a href="mailto:support@helpem.ai" className="text-brandBlue hover:underline font-medium">
              support@helpem.ai
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
