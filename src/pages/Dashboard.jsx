import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [approved, setApproved] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [numbers, setNumbers] = useState([]);
  const evtSourceRef = useRef(null);

  // ✅ Your live backend URL (Render)
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "https://numify-backend.onrender.com";

  // ✅ Check login + approval
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setUser(u);

      const docRef = doc(db, "users", u.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const d = snap.data();
        setApproved(!!d.approved);

        if (!d.approved) {
          alert("Your account is not approved yet. Please wait for admin approval.");
          window.location.href = "/subscribe";
        }
      } else {
        window.location.href = "/";
      }
    });

    // ✅ Cleanup on unmount (close EventSource)
    return () => {
      unsub();
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }
    };
  }, []);

  // ✅ Start scraping
  async function startScrape() {
    if (!user) return;
    if (!liveUrl) return alert("Paste TikTok live URL");

    try {
      const idToken = await getIdToken(user, true);

      const res = await fetch(`${BACKEND_URL}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ live_url: liveUrl }),
      });

      const j = await res.json();

      if (!res.ok) {
        console.error("Start failed:", j);
        alert(j.detail || j.message || "Error starting scraper");
        return;
      }

      // ✅ Connect to the SSE stream with token in query param
      connectEventStream(idToken);
    } catch (err) {
      console.error("Start scrape error:", err);
      alert("Failed to start scraper. Check console for details.");
    }
  }

  // ✅ Stop scraping
  async function stopScrape() {
    if (!user) return;

    try {
      const idToken = await getIdToken(user, true);

      await fetch(`${BACKEND_URL}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }

      alert("Scraper stopped successfully");
    } catch (err) {
      console.error("Stop scrape error:", err);
      alert("Failed to stop scraper. Check console for details.");
    }
  }

  // ✅ Connect to EventSource (real-time updates)
  function connectEventStream(token) {
    const sseUrl = `${BACKEND_URL}/stream?token=${token}`;
    console.log("🔌 Connecting to stream:", sseUrl);

    const es = new EventSource(sseUrl);
    evtSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("📩 New number:", data);

        setNumbers((prev) => {
          if (prev.find((p) => p.number === data.number)) return prev;
          return [data, ...prev];
        });
      } catch (err) {
        console.error("SSE JSON parse error:", err);
      }
    };

    es.onerror = (err) => {
      console.error("⚠️ SSE connection lost. Reconnecting in 5s...", err);
      es.close();
      setTimeout(() => connectEventStream(token), 5000); // auto reconnect
    };
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl text-center">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>

        <div className="mb-4">
          <input
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="Paste TikTok Live URL"
            className="border p-2 w-full rounded"
          />
        </div>

        <div className="space-x-3 mb-6">
          <button
            onClick={startScrape}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Start
          </button>
          <button
            onClick={stopScrape}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Stop
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Extracted phone numbers</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-1">#</th>
                  <th>Number</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {numbers.length > 0 ? (
                  numbers.map((n, i) => (
                    <tr key={n.number} className="border-t">
                      <td className="py-1">{i + 1}</td>
                      <td>{n.number}</td>
                      <td>{n.message}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-4 text-gray-500">
                      No numbers yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
