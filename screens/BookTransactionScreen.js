import React from 'react';
import firebase from 'firebase';
import db from '../config';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ToastAndroid,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Permissions from 'expo-permissions';

class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedBookID: '',
      scannedStudentID: '',
      buttonState: 'normal',
      transactionMessage: '',
    };
  }

  getCameraPermissions = async (ID) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermissions: status === 'granted',
      buttonState: ID,
      scanned: false,
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    const { buttonState } = this.state;
    if (buttonState === 'bookID') {
      this.setState({
        scanned: true,
        scannedBookID: data,
        buttonState: 'normal',
      });
    } else if (buttonState === 'studentID') {
      this.setState({
        scanned: true,
        scannedStudentID: data,
        buttonState: 'normal',
      });
    }
  };

  initiateBookIssue = async () => {
    db.collection('transactions').add({
      bookId: this.state.scannedBookID,
      studentId: this.state.scannedStudentID,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: 'Issue',
    });

    //Change the book's availabilty status
    db.collection('books').doc(this.state.scannedBookID).update({
      bookAvailability: false,
    });
    //Cahnf=ge number of books issued by students
    db.collection('students')
      .doc(this.state.scannedStudentID)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(1),
      });
    this.setState({
      scannedBookID: '',
      scannedStudentID: '',
    });
  };

  initiateBookReturn = async () => {
    db.collection('transactions').add({
      bookId: this.state.scannedBookID,
      studentId: this.state.scannedStudentID,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: 'Return',
    });

    //Change the book's availabilty status
    db.collection('books').doc(this.state.scannedBookID).update({
      bookAvailability: true,
    });
    //Cahnf=ge number of books issued by students
    db.collection('students')
      .doc(this.state.scannedStudentID)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(-1),
      });
    this.setState({
      scannedBookID: '',
      scannedStudentID: '',
    });
  };

  handleTransaction = async () => {
    //   var transactionMessage;
    //   db.collection('books')
    //     .doc(this.state.scannedBookID)
    //     .get()
    //     .then((doc) => {
    //       var book = doc.data();
    //       if (book.bookAvailability) {
    //         this.initiateBookIssue();
    //         transactionMessage = 'bookIssue';
    //         //Alert.alert("Book has been issued")
    //         ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
    //       } else {
    //         this.initiateBookReturn();
    //         transactionMessage = 'book Return';
    //         //Alert.alert("Book has been Returned")
    //         ToastAndroid.show(transactionMessage,ToastAndroid.SHORT)
    //       }
    //     });
    //   this.setState({ transactionMessage: transactionMessage });

    //Editing function

    var transactionType = await this.checkBookEligibility();
    console.log('TransactionType', transactionType);

    if (!transactionType) {
      alert('Book not available :( ');
      this.setState({
        scannedStudentID: '',
        scannedBookID: '',
      });
    }

    else if(transactionType=="Issue"){
      var isStudentEligible=await this.checkStudentEligibilityForBookIssue();
      if(isStudentEligible){
        this.initiateBookIssue()
        alert("The book has been issued :) ")
      }
      
    }

    else{
    var isStudentEligible=await this.checkStudentEligibilityForReturn();
      if(isStudentEligible){
        this.initiateBookReturn()
        alert("The book has been returned :) ")
    }
    }
    

  };


checkBookEligibility = async () => {
    const bookRef = await db
      .collection("books")
      .where("bookId", "==", this.state.scannedBookID)
      .get();
    var transactionType = "";
    if (bookRef.docs.length == 0) {
      transactionType = false;
    } else {
      bookRef.docs.map(doc => {
        var book = doc.data();
        if (book.bookAvailability) {
          transactionType = "Issue";
        } else {
          transactionType = "Return";
        }
      });
    }

    return transactionType;
  };

  checkStudentEligibilityForBookIssue = async () => {
    const studentRef = await db
      .collection("students")
      .where("studentId", "==", this.state.scannedStudentID)
      .get();
    var isStudentEligible = "";
    if (studentRef.docs.length == 0) {
      this.setState({
        scannedStudentID: "",
        scannedBookID: ""
      });
      isStudentEligible = false;
      alert("The student id doesn't exist in the database!");
    } else {
      studentRef.docs.map(doc => {
        var student = doc.data();
        
        if (student.numberOfBooksIssued < 2) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;
          alert("The student has already issued 2 books!");
          this.setState({
            scannedStudentID: "",
            scannedBookID: ""
          });
        }
      });
    }

    return isStudentEligible;
  };

  checkStudentEligibilityForReturn = async () => {
    const transactionRef = await db
      .collection("transactions")
      .where("bookId", "==", this.state.scannedBookID)
      .limit(1)
      .get();
    var isStudentEligible = "";
    transactionRef.docs.map(doc => {
      var lastBookTransaction = doc.data();
      if (lastBookTransaction.studentId === this.state.scannedStudentID) {
        isStudentEligible = true;
      } else {
        isStudentEligible = false;
        alert("The book wasn't issued by this student!");
        this.setState({
          scannedStudentID: "",
          scannedBookID: ""
        });
      }
    });
    return isStudentEligible;
  };

  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;

    if (buttonState !== 'normal' && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}></BarCodeScanner>
      );
    } else if (buttonState == 'normal') {
      return (
        <View style={styles.container}>
          <View>
            <Image
              source={require('../assets/booklogo.jpg')}
              style={{ width: 100, height: 100 }}
            />
            <Text> Wiley</Text>
          </View>

          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Book ID"
              onChangeText={(text) => {
                this.setState({ scannedBookID: text });
              }}
              value={this.state.scannedBookID}
            />
            <TouchableOpacity
              onPress={() => this.getCameraPermissions('bookID')}
              style={styles.scanButton}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Student ID"
              onChangeText={(text) => {
                this.setState({ scannedStudentID: text });
              }}
              value={this.state.scannedStudentID}
            />
            <TouchableOpacity
              onPress={() => this.getCameraPermissions('studentID')}
              style={styles.scanButton}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => this.handleTransaction()}>
            <Text>Submit</Text>
          </TouchableOpacity>
        </View>

        //      <Text style={styles.displayText}>
        //          {hasCameraPermissions===true?this.state.scannedData:"Request camera permission..."}
        //      </Text>
        // <TouchableOpacity onPress={this.getCameraPermissions}
        // style={styles.scanButton}>
        //     <Text style={styles.buttonText}>Scan QR Code</Text>
        // </TouchableOpacity>
      );
    }
  }
}

export default TransactionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  displayText: { fontSize: 15, textDecorationLine: 'underline' },
  scanButton: { backgroundColor: '#2196F3', padding: 10, margin: 10 },
  buttonText: {
    fontSize: 20,
  },
  inputBox: {
    borderWidth: 3,
  },
  inputView: {
    flexDirection: 'row',
  },
});
