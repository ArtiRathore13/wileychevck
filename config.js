import firebase from 'firebase';

var firebaseConfig = {
    apiKey: "AIzaSyDAy-UxH4YYZUbcjVsbliW8kaP29011-IY",
    authDomain: "wily-2b18e.firebaseapp.com",
    databaseURL: "https://wily-2b18e-default-rtdb.firebaseio.com",
    projectId: "wily-2b18e",
    storageBucket: "wily-2b18e.appspot.com",
    messagingSenderId: "938100910481",
    appId: "1:938100910481:web:4534628adf803d73be9230"
  };
  // Initialize Firebase
 if(!firebase.apps.length){
  firebase.initializeApp(firebaseConfig);
}

  export default firebase.firestore();