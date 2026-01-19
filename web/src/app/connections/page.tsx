"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Connection = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "connected" | "available" | "coming_soon";
  category: "calendar" | "productivity" | "communication" | "storage";
  connectedAt?: string;
  email?: string;
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([
    // Calendar Integrations
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync your Google Calendar events to helpem",
      icon: "📅",
      status: "coming_soon",
      category: "calendar",
    },
    {
      id: "apple-calendar",
      name: "Apple Calendar",
      description: "Import events from Apple Calendar",
      icon: "📆",
      status: "coming_soon",
      category: "calendar",
    },
    {
      id: "outlook-calendar",
      name: "Outlook Calendar",
      description: "Connect your Microsoft Outlook calendar",
      icon: "📬",
      status: "coming_soon",
      category: "calendar",
    },
    
    // Productivity Tools
    {
      id: "notion",
      name: "Notion",
      description: "Sync tasks and notes with Notion",
      icon: "📝",
      status: "coming_soon",
      category: "productivity",
    },
    {
      id: "todoist",
      name: "Todoist",
      description: "Import tasks from Todoist",
      icon: "✅",
      status: "coming_soon",
      category: "productivity",
    },
    {
      id: "trello",
      name: "Trello",
      description: "Connect your Trello boards",
      icon: "📋",
      status: "coming_soon",
      category: "productivity",
    },
    
    // Communication
    {
      id: "slack",
      name: "Slack",
      description: "Create tasks from Slack messages",
      icon: "💬",
      status: "coming_soon",
      category: "communication",
    },
    {
      id: "gmail",
      name: "Gmail",
      description: "Turn emails into tasks",
      icon: "✉️",
      status: "coming_soon",
      category: "communication",
    },
    
    // Storage
    {
      id: "google-drive",
      name: "Google Drive",
      description: "Access files from Google Drive",
      icon: "📁",
      status: "coming_soon",
      category: "storage",
    },
    {
      id: "dropbox",
      name: "Dropbox",
      description: "Connect to Dropbox files",
      icon: "📦",
      status: "coming_soon",
      category: "storage",
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", name: "All Integrations", icon: "🔌" },
    { id: "calendar", name: "Calendar", icon: "📅" },
    { id: "productivity", name: "Productivity", icon: "✅" },
    { id: "communication", name: "Communication", icon: "💬" },
    { id: "storage", name: "Storage", icon: "📁" },
  ];

  const filteredConnections =
    selectedCategory === "all"
      ? connections
      : connections.filter((c) => c.category === selectedCategory);

  const connectedCount = connections.filter((c) => c.status === "connected").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brandText mb-2">Connections</h1>
              <p className="text-brandTextLight">
                Connect helpem to your productivity ecosystem
              </p>
            </div>
            <Link
              href="/app"
              className="px-4 py-2 border-2 border-brandBlue text-brandBlue rounded-xl hover:bg-brandBlue hover:text-white transition-all font-medium"
            >
              ← Back to App
            </Link>
          </div>
          
          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-brandBlue/10 to-brandGreen/10 p-4 rounded-xl">
              <div className="text-2xl font-bold text-brandText">{connectedCount}</div>
              <div className="text-sm text-brandTextLight">Connected</div>
            </div>
            <div className="bg-gradient-to-br from-brandBlue/10 to-brandGreen/10 p-4 rounded-xl">
              <div className="text-2xl font-bold text-brandText">{connections.length}</div>
              <div className="text-sm text-brandTextLight">Available</div>
            </div>
            <div className="bg-gradient-to-br from-brandBlue/10 to-brandGreen/10 p-4 rounded-xl">
              <div className="text-2xl font-bold text-brandText">♾️</div>
              <div className="text-sm text-brandTextLight">More Coming</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-brandBlue to-brandGreen text-white shadow-lg"
                  : "bg-white text-brandTextLight hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Connections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnections.map((connection) => (
            <div
              key={connection.id}
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                connection.status === "connected"
                  ? "border-brandGreen shadow-lg"
                  : connection.status === "available"
                  ? "border-brandBlue/20 hover:border-brandBlue hover:shadow-lg"
                  : "border-gray-200 opacity-75"
              }`}
            >
              {/* Icon & Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{connection.icon}</div>
                {connection.status === "connected" && (
                  <span className="px-3 py-1 bg-brandGreen/10 text-brandGreen text-xs font-semibold rounded-full">
                    Connected
                  </span>
                )}
                {connection.status === "coming_soon" && (
                  <span className="px-3 py-1 bg-gray-100 text-brandTextLight text-xs font-semibold rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Name & Description */}
              <h3 className="text-xl font-bold text-brandText mb-2">
                {connection.name}
              </h3>
              <p className="text-sm text-brandTextLight mb-4">
                {connection.description}
              </p>

              {/* Connected Info */}
              {connection.status === "connected" && connection.email && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-brandTextLight mb-1">Connected as:</div>
                  <div className="text-sm text-brandText font-medium">{connection.email}</div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-auto pt-4">
                {connection.status === "connected" ? (
                  <button className="w-full px-4 py-2 border-2 border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-medium">
                    Disconnect
                  </button>
                ) : connection.status === "available" ? (
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-xl hover:shadow-lg transition-all font-medium">
                    Connect
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 text-brandTextLight rounded-xl font-medium cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-br from-brandBlue to-brandGreen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Your Personal Command Center</h2>
          <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
            helpem connects to the tools you already use, creating a unified hub for your productivity.
          </p>
          <p className="text-sm text-white/75">
            Don't see your favorite tool? Email us at{" "}
            <a href="mailto:support@helpem.ai" className="underline font-semibold">
              support@helpem.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
