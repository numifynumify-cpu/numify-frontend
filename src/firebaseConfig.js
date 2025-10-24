// Replace with your firebaseConfig (you provided earlier)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDFLYOa6gCV8CBZ9nNS1LFy1d5jckWTpSk",
  authDomain: "numify-5d502.firebaseapp.com",
  projectId: "numify-5d502",
  storageBucket: "numify-5d502.appspot.com",
  messagingSenderId: "363948795323",
  appId: "1:363948795323:web:5180eb4c5de7cd41bf909e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
