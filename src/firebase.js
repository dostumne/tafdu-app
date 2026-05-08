// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_JMU-jRqfBbF5O6ahf84KbxVAPSpSXyQ",
  authDomain: "tafdu-aa251.firebaseapp.com",
  projectId: "tafdu-aa251",
  storageBucket: "tafdu-aa251.firebasestorage.app",
  messagingSenderId: "35189755821",
  appId: "1:35189755821:web:084d904f28d8f31bcddb24"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);