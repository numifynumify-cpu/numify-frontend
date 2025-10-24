import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  // Listen for login + Firestore updates
useEffect(() => {
  const unsubAuth = onAuthStateChanged(auth, (u) => {
    if (!u) {
      navigate("/");
      return;
    }
    setUser(u);

    const userRef = doc(db, "users", u.uid);
    const unsubSnap = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        console.log("❌ No user doc found");
        setLoading(false);
        return;
      }

      const data = snap.data();
      console.log("👀 Firestore user data:", data);

      const approved = data.approved === true;
      const exp = data.expiredAt;

      if (approved && exp) {
        const expDate = exp.toDate ? exp.toDate() : new Date(exp);
        console.log("✅ Approved:", approved, "ExpiredAt:", expDate);

        if (expDate > new Date()) {
          console.log("➡️ Redirecting to dashboard...");
          navigate("/dashboard");
          return;
        } else {
          console.log("⚠️ Subscription expired");
        }
      } else {
        console.log("⚠️ Not approved or no expiredAt");
      }

      setLoading(false);
    });

    return () => unsubSnap();
  });

  return () => unsubAuth();
}, [navigate]);


  // Submit subscription request
  async function requestAccess(planMonths) {
    if (!user) return alert("Please sign in first.");
    setSending(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const now = new Date();
      const dummyExpire = Timestamp.fromDate(new Date(now.getTime() + 1000)); // add 1 sec just to create the field

      await setDoc(
        userRef,
        {
          email: user.email,
          phone: user.phoneNumber || "",
          plan: planMonths,
          requestedAt: serverTimestamp(),
          approved: false,
          expiredAt: dummyExpire, // ensures field is created
          role: "user",
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "subscriptions", user.uid),
        {
          userId: user.uid,
          email: user.email,
          plan: planMonths,
          price: planMonths === 1 ? 100 : planMonths === 3 ? 240 : 800,
          status: "requested",
          approved: false,
          expiredAt: dummyExpire, // ensures field is created
          requestedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Request sent. Wait for admin approval.");
    } catch (err) {
      console.error(err);
      alert("Error sending subscription request.");
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-4">Choose your plan</h2>

        <div className="space-y-3">
          <button
            disabled={sending}
            onClick={() => requestAccess(1)}
            className="w-full py-2 rounded bg-indigo-600 text-white"
          >
            1 Month — 100 TND
          </button>
          <button
            disabled={sending}
            onClick={() => requestAccess(3)}
            className="w-full py-2 rounded bg-indigo-600 text-white"
          >
            3 Months — 240 TND
          </button>
          <button
            disabled={sending}
            onClick={() => requestAccess(12)}
            className="w-full py-2 rounded bg-indigo-600 text-white"
          >
            12 Months — 800 TND
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          After requesting, admin will approve your subscription manually.
        </p>
      </div>
    </div>
  );
}

