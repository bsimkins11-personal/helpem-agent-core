"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { getClientSessionToken } from "@/lib/clientSession";

type TribeInfo = {
  id: string;
  name: string;
  memberCount: number;
};

export default function JoinTribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tribe, setTribe] = useState<TribeInfo | null>(null);
  const [joined, setJoined] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication and load tribe info
  useEffect(() => {
    const checkAuthAndLoadTribe = async () => {
      // Check if user is authenticated
      const sessionToken = getClientSessionToken();
      setIsAuthenticated(!!sessionToken);

      // Load tribe info (doesn't require auth)
      try {
        const res = await fetch(`/api/tribes/join/${token}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTribe(data.tribe);
        } else {
          setError(data.error || "Invalid invite link");
        }
      } catch (err) {
        setError("Failed to load invite information");
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadTribe();
  }, [token]);

  const handleJoin = async () => {
    const sessionToken = getClientSessionToken();
    
    if (!sessionToken) {
      // Redirect to app with the invite token to handle after sign in
      window.location.href = `/app?invite=${token}`;
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/tribes/join/${token}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setJoined(true);
      } else {
        setError(data.error || "Failed to join tribe");
      }
    } catch (err) {
      setError("Failed to join tribe. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const openInApp = () => {
    // Try to open the app using a custom URL scheme
    const appUrl = `helpem://join/${token}`;
    const webUrl = window.location.href;
    
    // Try to open in app, fall back to App Store
    const appStoreUrl = "https://apps.apple.com/app/helpem/id6738968880";
    
    // Create a hidden iframe to try opening the app
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = appUrl;
    document.body.appendChild(iframe);
    
    // After a short delay, if the page is still visible, redirect to App Store
    setTimeout(() => {
      document.body.removeChild(iframe);
      // If document is still visible, app didn't open
      if (!document.hidden) {
        window.location.href = appStoreUrl;
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #f9fafb, white)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            border: "4px solid #e5e7eb", 
            borderTopColor: "#8b5cf6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ color: "#6b7280" }}>Loading invitation...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !tribe) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #f9fafb, white)",
        padding: "24px"
      }}>
        <div style={{ 
          textAlign: "center",
          background: "white",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          maxWidth: "400px"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>😕</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
            Invalid Invite
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            {error}
          </p>
          <Link
            href="/app"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "linear-gradient(to right, #8b5cf6, #7c3aed)",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: "500"
            }}
          >
            Go to helpem
          </Link>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #f9fafb, white)",
        padding: "24px"
      }}>
        <div style={{ 
          textAlign: "center",
          background: "white",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          maxWidth: "400px"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🎉</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937", marginBottom: "12px" }}>
            Welcome to {tribe?.name}!
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "24px" }}>
            You&apos;ve successfully joined the tribe.
          </p>
          <Link
            href="/app"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: "linear-gradient(to right, #8b5cf6, #7c3aed)",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: "500"
            }}
          >
            Open helpem
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(to bottom right, #f9fafb, white)",
      padding: "24px"
    }}>
      <div style={{ 
        textAlign: "center",
        background: "white",
        padding: "48px",
        borderRadius: "24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        maxWidth: "400px",
        width: "100%"
      }}>
        {/* Logo */}
        <div style={{ 
          fontSize: "48px", 
          marginBottom: "24px",
          background: "linear-gradient(to bottom right, #8b5cf6, #7c3aed)",
          width: "80px",
          height: "80px",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px"
        }}>
          👥
        </div>

        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1f2937", marginBottom: "8px" }}>
          Join {tribe?.name}
        </h1>
        
        <p style={{ color: "#6b7280", marginBottom: "8px" }}>
          You&apos;ve been invited to join a tribe on helpem
        </p>
        
        <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "32px" }}>
          {tribe?.memberCount} member{tribe?.memberCount !== 1 ? "s" : ""}
        </p>

        {error && (
          <div style={{ 
            background: "#fef2f2", 
            color: "#dc2626", 
            padding: "12px", 
            borderRadius: "8px",
            marginBottom: "24px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isAuthenticated ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                padding: "14px 24px",
                background: "linear-gradient(to right, #8b5cf6, #7c3aed)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: joining ? "not-allowed" : "pointer",
                opacity: joining ? 0.7 : 1
              }}
            >
              {joining ? "Joining..." : "Join Tribe"}
            </button>
          ) : (
            <>
              <button
                onClick={openInApp}
                style={{
                  padding: "14px 24px",
                  background: "linear-gradient(to right, #8b5cf6, #7c3aed)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Open in App
              </button>
              
              <button
                onClick={handleJoin}
                style={{
                  padding: "14px 24px",
                  background: "white",
                  color: "#8b5cf6",
                  border: "2px solid #8b5cf6",
                  borderRadius: "12px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Sign In to Join
              </button>
            </>
          )}
        </div>

        <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "24px" }}>
          Don&apos;t have the app?{" "}
          <a 
            href="https://apps.apple.com/app/helpem/id6738968880"
            style={{ color: "#8b5cf6", textDecoration: "underline" }}
          >
            Download helpem
          </a>
        </p>
      </div>
    </div>
  );
}
