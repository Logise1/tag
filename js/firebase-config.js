/* ==========================================
   Firebase Configuration
   ========================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCi24lA_2lDeyYC6Sbt4StOIXAsANu1T4U",
    authDomain: "tagg-dae15.firebaseapp.com",
    databaseURL: "https://tagg-dae15-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tagg-dae15",
    storageBucket: "tagg-dae15.firebasestorage.app",
    messagingSenderId: "1293958828",
    appId: "1:1293958828:web:5dc81c12c2b7d31ebc2909",
    measurementId: "G-4QRVZQMV36"
};


firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

// Email domain for internal use
const EMAIL_DOMAIN = '@tag.com';
