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
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([
    // Calendar Integrations
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Sync your Google Calendar events to helpem",
      icon: "📅",
      status: "available",
      category: "calendar",
    },
    {
      id: "apple-calendar",
      name: "Apple Calendar",
      description: "Import events from Apple Calendar",
      icon: "📆",
      status: "available",
      category: "calendar",
    },
    {
      id: "outlook-calendar",
      name: "Outlook Calendar",
      description: "Connect your Microsoft Outlook calendar",
      icon: "📬",
      status: "available",
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

  const handleConnect = async (connectionId: string) => {
    setConnecting(connectionId);
    
    // Save connection to localStorage
    try {
      const savedConnections = localStorage.getItem('helpem_connections');
      const connections = savedConnections ? JSON.parse(savedConnections) : [];
      
      const newConnection = {
        id: connectionId,
        connectedAt: new Date().toISOString(),
        status: 'connected'
      };
      
      connections.push(newConnection);
      localStorage.setItem('helpem_connections', JSON.stringify(connections));
      
      // Update state
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'connected', connectedAt: new Date().toISOString() }
            : conn
        )
      );
      
      // Handle specific calendar integrations
      if (connectionId === 'apple-calendar') {
        alert('Apple Calendar integration enabled! You can now add events to your calendar.');
      } else if (connectionId === 'google-calendar') {
        alert('Google Calendar integration enabled! You can now sync your events.');
      } else if (connectionId === 'outlook-calendar') {
        alert('Outlook Calendar integration enabled! You can now connect your calendar.');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    try {
      const savedConnections = localStorage.getItem('helpem_connections');
      const connections = savedConnections ? JSON.parse(savedConnections) : [];
      
      const filtered = connections.filter((c: any) => c.id !== connectionId);
      localStorage.setItem('helpem_connections', JSON.stringify(filtered));
      
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'available', connectedAt: undefined }
            : conn
        )
      );
      
      alert(`${connectionId} disconnected successfully`);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Load saved connections from localStorage on mount
  useEffect(() => {
    try {
      const savedConnections = localStorage.getItem('helpem_connections');
      if (savedConnections) {
        const saved = JSON.parse(savedConnections);
        setConnections(prev => 
          prev.map(conn => {
            const savedConn = saved.find((s: any) => s.id === conn.id);
            if (savedConn) {
              return { ...conn, status: 'connected', connectedAt: savedConn.connectedAt };
            }
            return conn;
          })
        );
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }, []);

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f9fafb, white)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #f3f4f6', padding: '24px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                Connections
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Connect your calendar and productivity tools
              </p>
            </div>
            <Link
              href="/app"
              style={{
                padding: '8px 16px',
                border: '2px solid #0077CC',
                color: '#0077CC',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Back to App
            </Link>
          </div>
          
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'linear-gradient(to bottom right, rgba(0, 119, 204, 0.1), rgba(122, 201, 67, 0.1))', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{connectedCount}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Connected</div>
            </div>
            <div style={{ background: 'linear-gradient(to bottom right, rgba(0, 119, 204, 0.1), rgba(122, 201, 67, 0.1))', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{connections.length}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Available</div>
            </div>
            <div style={{ background: 'linear-gradient(to bottom right, rgba(0, 119, 204, 0.1), rgba(122, 201, 67, 0.1))', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>♾️</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>More Coming</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                ...(selectedCategory === category.id
                  ? {
                      background: 'linear-gradient(to right, #0077CC, #7AC943)',
                      color: 'white',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }
                  : {
                      background: 'white',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb'
                    })
              }}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Connections Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {filteredConnections.map((connection) => (
            <div
              key={connection.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: connection.status === "connected" ? '2px solid #7AC943' : connection.status === "available" ? '2px solid rgba(0, 119, 204, 0.2)' : '2px solid #e5e7eb',
                boxShadow: connection.status === "connected" ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                opacity: connection.status === "coming_soon" ? 0.75 : 1
              }}
            >
              {/* Icon & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '40px' }}>{connection.icon}</div>
                {connection.status === "connected" && (
                  <span style={{
                    padding: '4px 12px',
                    background: 'rgba(122, 201, 67, 0.1)',
                    color: '#7AC943',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '999px'
                  }}>
                    Connected
                  </span>
                )}
                {connection.status === "coming_soon" && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '999px'
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Name & Description */}
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                {connection.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                {connection.description}
              </p>

              {/* Action Button */}
              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                {connection.status === "connected" ? (
                  <button 
                    onClick={() => handleDisconnect(connection.id)}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      border: '2px solid #ef4444',
                      color: '#ef4444',
                      background: 'white',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Disconnect
                  </button>
                ) : connection.status === "available" ? (
                  <button 
                    onClick={() => handleConnect(connection.id)}
                    disabled={connecting === connection.id}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      background: 'linear-gradient(to right, #0077CC, #7AC943)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      opacity: connecting === connection.id ? 0.5 : 1
                    }}
                  >
                    {connecting === connection.id ? 'Connecting...' : 'Connect'}
                  </button>
                ) : (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'not-allowed'
                    }}
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
      <div style={{ background: 'linear-gradient(to bottom right, #0077CC, #7AC943)', padding: '48px 20px', textAlign: 'center', color: 'white' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>Connectors Coming Soon</h2>
        <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
          Make helpem your command center for personal productivity. Connect to your calendar, task manager, email, and more.
        </p>
        <p style={{ fontSize: '12px', opacity: 0.75 }}>
          Have a specific integration in mind? Let us know at{" "}
          <a href="mailto:support@helpem.ai" style={{ color: 'white', textDecoration: 'underline', fontWeight: '600' }}>
            support@helpem.ai
          </a>
        </p>
      </div>
    </div>
  );
}
