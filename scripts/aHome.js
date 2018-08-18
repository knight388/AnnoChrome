//URLs for scripts
// var baseURL = "https://localhost/AnnotateX/Scripts/Dev/";    //local server - macOS
var baseURL = "https://www.11trees.com/annotate/scripts/prod/";									//production

//Global variables
arrUserData = [];      //Hold userID, clientID, clientName, features...
// arrLibResources = [];   //hold the

//Email validation for signup
var pwValidateState;    //0 = validated; >0 means invalid
var emailValidateState=false; //true = real email

// The initialize function is run each time the page is loaded.
// window.onload = function(){
$(document).ready(function () {   // The initialize function is run each time the page is loaded.
  "use strict";

  var config = {
    apiKey: "AIzaSyBUgUUAIF_WdLpXTM91csO8xnmCergJ9sI",
    authDomain: "trees-3aac6.firebaseapp.com",
    databaseURL: "https://trees-3aac6.firebaseio.com",
    storageBucket: "trees-3aac6.appspot.com",
    // messagingSenderId: "819483525640"
  };

// Begin Firebase logic -------------------
  firebase.initializeApp(config);
  firebase.auth().getRedirectResult().then(function(result) {
    if (result.credential) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
    }
    var user = result.user;
  }).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    var email = error.email;
    var credential = error.credential;
    if (errorCode === 'auth/account-exists-with-different-credential') {
      $('#flexModalHeader').html('That email address has already been used...');
      $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">You have already signed up with this email address (" + email + ").<p></p>So either you\'ve logged in with this email address and a password or you used Google authentication. Try the other route please!</p><p></p><p>Feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a> if you aren\'t sure how to proceed.</p>");
      $('#flexModal').modal('show');
      // If you are using multiple auth providers on your app you should handle linking
      // the user's accounts here.
    } else {
      $('#flexModalHeader').html('Can\'t complete login...');
      $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We\'re sorry...we can\'t connect to the 11trees server to check your account. Are you on the internet? <p></p>Here's the error message: " + error + "</p><p></p><p>Feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a>.</p>");
      $('#flexModal').modal('show');
    }
  });

firebase.auth().onAuthStateChanged(function(user) {
  console.log("Firing the Auth State Change sub (updated)...");
  if (user) {     //We're logged in!

    //Set variables and update basics.
      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      var isAnonymous = user.isAnonymous;
      var uid = user.uid;
      // var refreshToken = user.refreshToken;
      // var providerData = user.providerData;

      if (user.emailVerified) {   //Account is verified
        // console.log('Email is verified - calling background...');
        // chrome.runtime.sendMessage({ msg: "startup", name: displayName, mail: email, uid: uid}, function(response){
        //   if (response.completed == "processed"){
        //     console.log('End verified logic...and startup in background, which populates arrays...so we can now move to aSearch by calling popup...'); //  + console.log(arrActiveLibs);
            // changePopupURL();
          // }
      // });
    }         //End IF USER VERIFIED logic

  else {    //NOT Verified
    console.log('Email is not verified');
    $('#homeStatus').html("<div class=\"panel panel-default\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We need to verify your identity. Check for an email from \"noreply@11trees.com\" asking you to click a link to confirm your account. The email should arrive within 5 minutes but may end up in your spam folder - so please check.</p><p></p><p><b>Some users have reported emails from us being blocked completely</b>. If you don't find the verification email in your inbox or spam folder, please contact your IT department.</p><p></p><p>Once you\'ve clicked the verification link in the email we sent you, click on the green \'A\' <b>Annotate PRO:</b> Extension button again and your account should load.</div></div>");
    $('#homeStatus').attr('class','show');

    $('#11treesPermission').attr('class','hide');
    $('#initialOptions').attr('class','hide');
    $('#LogIn').attr('class','hide');
    $('#SignUp').attr('class','hide');
    $('#firstWelcomeDiv').attr('class','hide');
    $('#ManualSignUp').attr('class','hide');
    // $('#welcomeDiv').attr('class','hide');
    // console.log("Starting verification email...")
    var currentUser = firebase.auth().currentUser;
    currentUser.sendEmailVerification().then(function() {
      console.log("Sending confirmation email...")
      // Email sent.
    }, function(error) {
        // An error happened.
          var errorCode = error.code;
          var errorMessage = error.message;
          console.log(errorCode + ' - ' + errorMessage);
          $('#flexModalHeader').html('Unable to validate your account...');
          $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We experienced the following error: " + errorMessage + "</p><p></p><p>If you can't resolve this issue on your own, feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a></p>");
          $('#flexModal').modal('show');
        });
    }   //End NOT Verified
  }     //End of if (user)

  else {    //NOT logged in
    updateStartPage();    //Sets divs to show specific button groups
    console.log("We don't think you're a Firebase user...");
    // User is signed out.
  }

});         // [END authstatelistener]


// Listeners for form validation

$('.emailFormat').blur(function(){
  if( !validateEmail($(this).val())) {
    $('#flexModalHeader').html('Invalid email...');
    $('#flexModalMsg').html("<p>Please enter a valid email of the form something@someemail.com.</p>");
    $('#flexModal').modal('show');
    // $(this).webuiPopover({title:'Invalid Email',
    // content:'Please enter a valid email of the form something@someemail.com.',
     // width:300,placement:'bottom'});
    // $(this).webuiPopover('show');
      console.log("Making email state valid = NO.");
      emailValidateState=false;
   }
  else{
    emailValidateState=true;
    console.log("Making email state VALID (why?).");
    }
});

// $('.pwFormat').blur(function(){
//   console.log("Trying to validate password...");
//   validatePassword($(this).val());
//   console.log("Back from sub..." + pwValidateState);
//     if(pwValidateState > 0){
//       $('#flexModalHeader').html('Invalid password...');
//       $('#flexModalMsg').html("<p>Please enter matching passwords at least 8 characters long with one or more capital letters and one or more numbers.</p>");
//       $('#flexModal').modal('show');
//       // $(this).webuiPopover({title:'Invalid Password',url:'#pwPopover',width:350,placement:'bottom'});
//       // $(this).webuiPopover('show');
//     }
// });

//Check values of 2 passwords, if we have 2 (for sign up)
$('#txtPassword2SignUp').blur(function(){
  var pw1 = $('#txtPassword1SignUp').val();
  var pw2 = $('#txtPassword2SignUp').val();

  if(pw1!=pw2 && pw2 != ''){
    // $('#pwMatch').html("<li>Your passwords must match.")
    console.log("PWs don't match at signup.")
    pwValidateState = pwValidateState+1;
    $('#flexModalHeader').html('Passwords must match...');
    $('#flexModalMsg').html("<p>Your passwords must match.</p>");
    $('#flexModal').modal('show');
    // $(this).webuiPopover({title:'Invalid Password',url:'#pwPopover',width:350,placement:'bottom'});
    // $(this).webuiPopover('show');
  }
  else {
    validatePassword(pw2);    //  Check one of the pws for validation.
    // pwValidateState = pwValidateState;
  }
});

// Listeners for buttons

$('#logOutBTN').click(function(){
  console.log('trying to logout...');
  // signOut();
   chrome.runtime.sendMessage({ msg: "signOut" });  //Call background.js sub
  });

  //Use CLASS to act on social sign in -------//

$('.btnGoogle').click(function(){
    console.log("Calling Google popup...");
    $('#loadingModal').modal('show');
     chrome.extension.sendMessage({ msg: "googleLoginPopUp" });   //Call background.js sub
    //  self.location.href='popup.html';
  });

$('.btnFacebook').click(function(){
  console.log('Logging in with Facebook...');
  $('#loadingModal').modal('show');
  chrome.extension.sendMessage({ msg: "facebookLoginPopUp" });   //Call background.js  sub
  //  self.location.href='popup.html';
});

$('#btnSignUp').click(function(){     //Initial signup request
  $('#SignUp').attr('class','show');
  $('#11treesPermission').attr('class','show');

  $('#firstWelcomeDiv').attr('class','hide');
  $('#initialOptions').attr('class','hide');
  $('#LogIn').attr('class','hide');
  $('#ManualSignUp').attr('class','hide');
});

$('.btnLogIn').click(function(){      //Initial request for manual login
  $('#LogIn').attr('class','show');

  $('#11treesPermission').attr('class','hide');
  $('#firstWelcomeDiv').attr('class','hide');
  $('#initialOptions').attr('class','hide');
  $('#SignUp').attr('class','hide');
  $('#ManualSignUp').attr('class','hide');
});

$('#btnManualSignUp1').click(function(){    //Request to enter manual signup
  $('#ManualSignUp').attr('class','show');
  $('#11treesPermission').attr('class','show');

  $('#firstWelcomeDiv').attr('class','hide');
  $('#initialOptions').attr('class','hide');
  $('#LogIn').attr('class','hide');
  $('#SignUp').attr('class','hide');
  $('#txtDisplayNameSignUp').focus();
});

$('#btnGotoSignUp').click(function(){     //Jump to sign up from Sign IN
  $('#SignUp').attr('class','show');
  $('#11treesPermission').attr('class','show');

  $('#initialOptions').attr('class','hide');
  $('#LogIn').attr('class','hide');
  $('#ManualSignUp').attr('class','hide');
});

$('#btnManualSignIn').click(function(){    //manual signin request
  console.log("Validatation state: " + pwValidateState + " | " + emailValidateState);

  console.log("Trying to validate password...");
  // validatePassword($(this).val());
  validatePassword($('#txtPasswordLogIn').val());
  console.log("Back from sub..." + pwValidateState);
    if(pwValidateState > 0){
      $('#flexModalHeader').html('Invalid password...');
      $('#flexModalMsg').html("<p>Please enter matching passwords at least 8 characters long with one or more capital letters and one or more numbers.</p>");
      $('#flexModal').modal('show');
      // $(this).webuiPopover({title:'Invalid Password',url:'#pwPopover',width:350,placement:'bottom'});
      // $(this).webuiPopover('show');
    } else {    //  Sign in...
      manualUserSignIn();
    }
});

$('#btnForgotPass').click(function(){
  console.log("Resetting password...");
  if( !validateEmail($('#txtEmailLogIn').val())) {
    $('#signUpErrorMsg').html("Please enter a valid email.");
    $('#signInModal').modal('show');
  }  else {
    $('#flexModalHeader').html('Password reset...');
    $('#flexModalMsg').html("<p>Check your inbox - we\'ve sent you an email you can use to reset your password.</p>");
    $('#flexModal').modal('show');
    resetPassword();
    }
});

$('#btnManualSignUp2').click(function(){    //manual signUP request
  console.log('Clicking SIGNUP after entering name and email and pw: ' + pwValidateState + ' / ' + emailValidateState);
  if(pwValidateState == 0 && emailValidateState==true){
    newUserSignUp();
  }
    else{
      $('#flexModalHeader').html('Check errors...');
      $('#flexModalMsg').html("<p>Please check the email and password you provided.</p>");
      $('#flexModal').modal('show');
    // $(this).webuiPopover({title:'Check Errors',content:'Please check the\
    // email and password you provided.',width:350,placement:'bottom'});
    // $(this).webuiPopover('show');
  }
});

$(document.body).on('click', '#validatedEmailConfirm', function(){
    //Button presented to user while they are waiting on validation email...
    location.reload();    //just reload the page
  });

$('#btnSupport').click(function(){
  window.open('https://www.11trees.com/live/support', '_blank');
});

  // -------------------- END Button Listeners ------------------------------ //

chrome.runtime.onMessage.addListener(     //Call from Extension page to refresh data...
  function(request, sender, sendResponse){

    if (request.msg == "gotoSearch") {
      console.log('In aHome.js | msg received to switch popup to aSearch.html');
      // getLibraries('selected', setupSearchPage1);
      self.location.href='aSearch.html';
    }

    if (request.msg == "errorLogin"){
      console.log('In aHome.js | msg received to show modal with error message on login...' + request.msgSender + ' / ' + request.msgContent);
      loginErrorMessage (request.msgContent, request.msgSender);
    }

});

  $('[data-toggle="tooltip"]').tooltip();   //  Initialize Bootstrap tooltips

});   //End document.ready

function updateStartPage(){
  console.log("Setting up home page so you can login...");
  $('#firstWelcomeDiv').attr('class','show');
  $('#initialOptions').attr('class','show');
  // $('#homeStatus').attr('class','show');
  $('#socialSignUp').attr('class','show');
  $('#socialLogIn').attr('class','show');

  // console.log("Setting up as Windows or Mac." + navigator.platform);

  $('#LogIn').attr('class','hide');
  $('#SignUp').attr('class','hide');
  $('#ManualSignUp').attr('class','hide');

}

function loginErrorMessage(errorMessage, sender){
  $('#flexModalHeader').html('Can\'t use ' + sender + ' Login...');
  $('#flexModalMsg').html("We\'re sorry...we can\t connect to the 11trees server to check your account. Are you on the internet? <p></p>Here's the error code: " + errorMessage + "</p><p></p><p>Feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a></p>");
  $('#flexModal').modal('show');
}


function signOut() {
  console.log("Logging out via subroutine in background.js.");
   firebase.auth().signOut();
   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
     chrome.tabs.sendMessage(tabs[0].id, {method: "logOut"});
    });
   chrome.browserAction.setPopup({   //Sets popup to last visited
     popup: 'aHome.html'   // Open this html file within the popup.
   });
}

// ------------------ Start FIREBASE/login handlers and functions --------------------- //

function newUserSignUp(){
  console.log("Made it to Firebase new user sub...");
  var displayName = $('#txtDisplayNameSignUp').val();
  var email = $('#txtEmailSignUp').val();
  var password = $('#txtPassword1SignUp').val();

  firebase.auth().createUserWithEmailAndPassword(email,password).then(function(user){
      console.log('everything went fine');
      console.log('user object:' + user);
      user.updateProfile({
          displayName: displayName,
        }).then(function() {
          console.log("Updating displayname to " + displayName);
          // Update successful.
        }, function(error) {
          // An error happened.
        });
      //you can save the user data here.
    }).catch(function(error) {
      console.log('there was an error');
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode + ' - ' + errorMessage);
      $('#flexModalHeader').html('Error creating your account via email...');
      $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We experienced the following error: " + errorMessage + "</p><p></p><p>If you can't resolve this issue on your own, feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a></p>");
      $('#flexModal').modal('show');
      });
}

  // Validate form entry (email, pw)

function validateEmail($email) {
     var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
     return emailReg.test( $email );
     console.log("Results of email validate sub: " + emailReg.test($email));
  }

function validatePassword($password){
  var pass = $password;

  console.log("Made it to password check sub. ");
  pwValidateState = 0;
  //validate the length
  if ( pass.length < 8 ) {
        $('#flexModalHeader').html('Please create a longer password...');
        $('#flexModalMsg').html("<p>Your password needs to be at least 8 characters long.</p>");
        $('#flexModal').modal('show');
        // $('#pwLength').html("<li>Please create a password at least <b>8 characters</b> long.</li>")
        console.log("Too short." + pass.length);
        pwValidateState = pwValidateState+1;
    } else {
        $('#pwLength').html("")
        console.log("Password passes validation.")
        pwValidateState = pwValidateState;
    }

  //validate capital letter
  if ( pass.match(/[A-Z]/) ) {
      $('#pwCapital').html("")
      pwValidateState = pwValidateState;
    } else {
      $('#flexModalHeader').html('Please include a capital letter...');
      $('#flexModalMsg').html("<p>Your password needs to include at least one capital letter.</p>");
      $('#flexModal').modal('show');
      // $('#pwCapital').html("<li>Please include at least one <b>capital letter</b>.</li>")
      console.log("Need capital.")
      pwValidateState = pwValidateState+1;
    }

  //validate number
  if ( pass.match(/\d/) ) {
    $('#pwNumber').html("")
    pwValidateState = pwValidateState;
    } else {
      $('#flexModalHeader').html('Please include at least one number...');
      $('#flexModalMsg').html("<p>Your password needs to include at least one number.</p>");
      $('#flexModal').modal('show');
      // $('#pwNumber').html("<li>Please include at least <b>one number</b>.</li>")
      console.log("Need number.")
      pwValidateState = pwValidateState+1;
    }

  //validate one letter
  if ( pass.match(/[A-z]/) ) {
      $('#pwLetter').html("")
      pwValidateState = pwValidateState;
    } else {
      $('#flexModalHeader').html('Please include at least one letter...');
      $('#flexModalMsg').html("<p>Your password needs to include at least one letter.</p>");
      $('#flexModal').modal('show');
      // $('#pwLetter').html("<li>Please include at least <b>one letter</b>.</li>")
      console.log("Too letter.")
      pwValidateState = pwValidateState+1;
    }
    return;
}

  // Handle Firebase / Auth Events -----------------------------

function manualUserSignIn(){
  // console.log("Made it to Firebase manual user login sub (updated)...");
  // $('#homeStatus').html('Made it to Firebase manual user login sub...');
  $('#loadingModal').modal('show');
  var email = $('#txtEmailLogIn').val();
  var password = $('#txtPasswordLogIn').val();
  // console.log("Going to pass the following to login existing user: " + email + " / " + password);
  firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log("Error message: " + errorMessage);
    $('#flexModalHeader').html('Error signing in via email...');
    $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We experienced the following error: " + errorMessage + "</p><p></p><p>If you can't resolve this issue on your own, feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages.</a></p>");
    $('#flexModal').modal('show');
    // ...
  });
}

function resetPassword(){
  var auth = firebase.auth();
  var emailAddress = $('#txtEmailLogIn').val();
  console.log("Sending email for pw reset: " + emailAddress);
  auth.sendPasswordResetEmail(emailAddress).then(function() {
    // Email sent.
  }, function(error) {
    // An error happened.
    console.log('there was an error');
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode + ' - ' + errorMessage);
    $('#flexModalHeader').html('Unable to complete a password reset...');
    $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We experienced the following error: " + errorMessage + "</p><p></p><p>If you can't resolve this issue on your own, feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/' target='_blank'>support pages</a></p>");
    $('#flexModal').modal('show');
  });
}
