"use client";

export default function ConnectionsTestPage() {
  console.log("🔌 Connections test page loaded!");
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>
        🔌
      </div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' }}>
        Connections Test Page
      </h1>
      <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
        If you can see this, navigation is working!
      </p>
      <div style={{
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '20px',
        borderRadius: '12px',
        maxWidth: '400px'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>📅 Apple Calendar</h2>
        <p style={{ fontSize: '14px', opacity: 0.9 }}>
          Sync your Apple Calendar events
        </p>
        <button style={{
          marginTop: '16px',
          padding: '12px 24px',
          background: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Connect
        </button>
      </div>
    </div>
  );
}
