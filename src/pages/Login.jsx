import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // check if user doc exists
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // ask for phone number (we show input below)
        } else {
          // redirect to subscribe or dashboard depending on approved
          const data = snap.data();
          if (data.approved) navigate("/dashboard");
          else navigate("/subscribe");
        }
      }
    });
    return () => unsub();
  }, []);

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      setUser(res.user);
    } catch (err) {
      console.error(err);
      alert("Login error");
    }
  }

  async function savePhoneAndCreateUser() {
    if (!user) return alert("Please login first");
    if (!/^\d{8}$/.test(phone)) return alert("Please enter an 8-digit Tunisian phone number");
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      phone,
      approved: false,
      requestedAt: serverTimestamp(),
      expiredAt: null,
      plan: null,
      role: "user"
    });
    navigate("/subscribe");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-4">Numify</h1>

        {!user && (
          <>
            <button onClick={loginWithGoogle} className="px-4 py-2 rounded bg-blue-600 text-white">
              Sign in with Google
            </button>
          </>
        )}

        {user && (
          <>
            <p className="mb-3">Signed in as <strong>{user.email}</strong></p>
            <div>
              <label className="block mb-1">Tunisian phone (8 digits)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 50123456" className="border p-2 w-full rounded mb-3" />
              <button onClick={savePhoneAndCreateUser} className="px-4 py-2 rounded bg-green-600 text-white">Save & Continue</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
