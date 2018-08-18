//URLs for scripts
// var baseURL = "https://localhost/AnnotateX/Scripts/Dev/";    //local server - macOS
var baseURL = "https://www.11trees.com/annotate/scripts/prod/";									//production


var arrLibrary = [];  //Hold library for global use
var searchArray = [];  //Hold search array - for predictive search (?)

var arrAvailableLib = [];   //  Hold details of available libraries for use (to be activated)
var arrActiveLib = [];    //  Holds ACTIVE library detail
var arrSelectedLib = [];    //  Selected Libraries (from multiselect)

var arrClickedLib = [];    //  Selected Libraries (from multiselect - so concise array)

var arrAvailableGroup = [];   //  Holds AVAILABLE GROUP detailed list
var arrActiveGroup = [];    //  Hold active comment groups
var arrSelectedGroup = [];    //  Hold SELECTED Group (after picking Libraries)
var arrCourseAssign = {};     //  Simple array to hold course and assignment id/names

var newCommentID = 0;     //    Holds counter for new comment
var googleFileID;       // FileId of Google Doc (if applicable)

var arrUserData = [];
var userID;
var licType;
var clientID;
var hostEditor;     //  Hold current editor - Google Docs, Canvas etc. Specific to ELEMENT (not overall frame/solution)
var recipientID;    //  Pulled from URL (Canvas, Google)
var recipientName;   // Pulled from Drive API (Google) and content script (Canvas)
var recipientPicUrl; // Pulled from Drive API (Google) and content script (Canvas)

var activeURL;      //  Hold current URL
var activeID;      //  Global variable to capture clicked/selected element in content script

//Canvas
var newCommentFlag = 0;
//  binary to indicate a new comment has been created and should be sent to server.
var speedGraderID = 'startup';
//  long unique ID for Canvas SG comments

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  //  Process to obtain student ID for Canvas (via URL parse) and Google Docs (via Google Drive API)
  var newURL = tab.url;      //  new URL
  // var changeURL = changeInfo.url;   //  existing URL
  // console.log('Chrome Tab URL Updated: ' + arrUserData.userPrefChromeLog + ' / currentURL: ' + activeURL + ' / newURL: ' + newURL);

  //  If Google Doc use the Google FileID to determine whether the URL has changed. Because clicking on a heading, in a Google Doc, yields a slightly different URL and we don't want to constantly update the Toolbar.
  if (newURL.includes("docs.google.com/document")){
    // console.log('checking to see if Google FileID has changed...');
    if ( typeof activeURL != 'undefined' && typeof newURL != 'undefined'){
      var oldGoogleFileID = getIdFromUrl(activeURL).toString();
      var newGoogleFileID = getIdFromUrl(newURL).toString();
      // console.log('File IDs - new/old ' + newGoogleFileID + ' / ' + oldGoogleFileID);
      if (oldGoogleFileID === newGoogleFileID){
        // console.log('setting URL same as original because it really has not changed - skip refreshing iframe');
        newURL = activeURL;
      }
    }
  }

  console.log('Before test of URL match: ' + newURL + ' / ' + activeURL);

  if (newURL !== activeURL){
  // if (activeURL != tempActiveURL){
    if (newURL.includes("chrome-extentension") === false && (newURL.includes("speed_grader") === true || newURL.includes("docs.google.com/document")) === true){
      console.log('Hosteditor is Canvas SG or Google Docs and 1URL after change: ' + newURL);
      activeURL = newURL;    //  Update activeURL if not null
      // activeURL = changeURL;    //  Update activeURL if not null
      // if (hostEditor === 'canvasspeedgrader'){
      //  Only run for Canvas
      //  In Canvas SG we can stay on the same tab but move between recipients...so need onUpdated
      updateRecipientID(activeURL);
      console.log('2URL of page is: ' + activeURL + ' with recipientID ' + recipientID + 'now refresh iFrame...');
    }
    //  Regardless - update iframe
    console.log('Now refresh iFrame...');
    refreshIframe();
  }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  // This runs when tab is changed
  chrome.tabs.get(activeInfo.tabId, function(tab){
     activeURL = tab.url;
     console.log('Activated tab URL: ' + activeURL);
     updateRecipientID(activeURL);
     // Need to refresh iFrame to pull any data from the page - name, avatar URL...
     refreshIframe();
  });
});

function getIdFromUrl(url){
  // console.log('passed this URL: ' + url);
  if (url.includes("docs.google.com/document") === true){     //   Regular Google Doc
    // console.log('Getting file ID - regular Google Doc...');
    return url.match(/[-\w]{25,}/);
  //  Goobric handled by messaging from content script
  // } else {        //    Goobric...
  //   console.log('Getting file ID - Goobric...');
  //   var myRegexp = /(?<=docId=)(.*)(?=&webApp)/igm;
  //   return url.match(myRegexp);
  // }
  }
}


function updateRecipientID(activeURL){
  console.log('In updateRecipientID - Get RecipID based on hosteditor: ' + activeURL);

  var editor;   //  Temp variable to check for the frame/URLs editor

  if (activeURL.includes("speed_grader") === true){
    editor = "canvasspeedgrader";
  } else if (activeURL.includes("docs.google.com/document") === true || activeURL.includes("script.google.com") === true){
    editor = "googledocs";
  } else {
    editor = 'noTB';     //  Don't use toolbars
    recipientID = '';     // Wipe the recipID - not using Gdocs or Canvas
    recipientName = '';   //  Wipe for non-Gdocs/Canvas applications
    recipientPicUrl = '';    //Wipe for non Godcs/Canvas
  }

  //  Canvas stuff - save student/recipientID

  if (editor === "canvasspeedgrader" && arrUserData.userPrefChromeLog > 0){
    console.log('Canvas-specific code...');
    var myRegexp = /%22student_id%22%3A%22(.*)%22/;
    var match = activeURL.match(myRegexp);    //  -1 if no studentID matches

    // console.log('Working on student: ' + match[0]);
    console.log('Working on student: ' + match[1]);

    recipientID = match[1];

  }

  if (editor === "googledocs" && arrUserData.userPrefChromeLog === 1){
  // if (activeURL.includes("docs.google.com/document") === true){     //  Don't run for Goobric
    console.log('Processing Google Docs...logging set to: ' + arrUserData.userPrefChromeLog);
    googleFileID = getIdFromUrl(activeURL);
    console.log("google file iD: " + googleFileID);
    // retrievePermissions(googleFileID, showGoogleDeets);
    // getGoogleFileData(googleFileID);      //  Call ajax to run Google Drive api
  }
}

//Firebase constants
var config = {
  apiKey: "AIzaSyBUgUUAIF_WdLpXTM91csO8xnmCergJ9sI",
  authDomain: "trees-3aac6.firebaseapp.com",
  databaseURL: "https://trees-3aac6.firebaseio.com",
  storageBucket: "trees-3aac6.appspot.com",
  // messagingSenderId: "819483525640"
};

firebase.initializeApp(config);

//listener for chrome start
chrome.runtime.onStartup.addListener(initApp());    //This fires verification check...

function initApp() {
  // Listen for auth state changes.
   // [START authstatelistener]
   var existingUser = firebase.auth().currentUser;
   console.log('InitApp - starting out...on platform: ' + navigator.platform);

   firebase.auth().onAuthStateChanged(function(user) {
     if (user) {
       // User is signed in.
       var displayName = user.displayName;
       var email = user.email;
       var emailVerified = user.emailVerified;
      //  var photoURL = user.photoURL;
      //  var isAnonymous = user.isAnonymous;
       var uid = user.uid;
       var providerData = user.providerData;
       console.log('We\'re a user...coming through: ') + console.log(providerData);
       console.log('Creds pulled from Firebase: ' + displayName + " / " + email + " / " + uid);

      if (user.emailVerified) {   //Account is verified
        console.log('Email verified and going to run startup... ' + emailVerified);
        //  This is called by HOME at login...don't need to do it twice
        startup(displayName,email,uid);   //checkUser against DB and pull/process data
      }  //End IS VERIFIED Account

     }    //End IF USER

     else {
       // Let's try to get a Google auth token programmatically.
       // [START_EXCLUDE]
       console.log('Not a logged in Firebase user (background.js)');
       // [END_EXCLUDE]
     }
   });

   // Google Drive startup - handled in 'updateRecipientID' sub

}

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        console.log("This is a first install!");
        var address = "http://www.11trees.com/live/support/using-annotate-for-google-chrome-and-google-docs/";
        alert("Thank you for trying Annotate PRO (AP)! \n\nPLEASE refresh any open web pages to finish your installation.\n\nAP is forever free - you can create as many Libraries of reusable Comments as you'd like, then use them to your heart's content to add text wherever you can type on the web. \n\nYour 14 day trial of our paid features starts now, including access to our College Edition and Legal Writing Edition Libraries. \n\nAlong with these optional Libraries, a paid subscription to AP adds history and analytics features to your account so you can easily review previous feedback and speed creation of new reusable Comments. \n\nInstitutions can license AP, making it easy to share Libraries and measure the impact of feedback. \n\nClick the green \'A\' in your Chrome toolbarto get started!")
        chrome.tabs.create({'url': address});
    }
    else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        // alert("Annotate PRO (AP) updated to the latest version automatically.\n\nPlease refresh any open web pages to make sure you have the latest version of AP running.\n\nThank you and happy feedback-ing!")
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
        var address = "http://www.11trees.com/live/support/support-annotate-pro/release-notes-annotate-pro-google-chrome/";
        // chrome.tabs.create({'url': address});
    }
});

  chrome.runtime.setUninstallURL('http://www.11trees.com/live/support/support-annotate-pro/complete-your-uninstall-annotate-pro/', function(inishUninstall){
  console.log('Uninstalling...');

});

//function that determines whether userID exists and library can be loaded or if new user must be created first
function startup(displayName,email,uid){
  console.log("Starting up...We\'re a VERIFIED user... " + displayName + " / " + email + " / " + uid);

  // var url1 = baseURL + "aCheckUsers.php"
  // var url2 = "&fbUserID=" + uid + "&UserEmail=" + email + "&fullName=" + displayName;

  var url1 = baseURL + "annoCheckUser.php";
  var url2 = "&fbUserID=" + uid + "&UserEmail=" + email + "&fullName=" + displayName + "&annoApp=Chrome";

  $.ajax({
    type: "POST",
    url: url1,
    data: url2,
    dataType: 'json',
    success: function(arrResult){
      arrUserData = arrResult;
      console.log('User data: ') + console.log(arrUserData);
      localStorage.userDetails = JSON.stringify(arrUserData);

      userID = arrUserData.userID;
      licType = arrUserData.LicType;
      clientID = arrUserData.clientID;
      localStorage.userID = arrUserData.userID;
      localStorage.displayName = arrUserData.fullName;
      localStorage.userEmail = arrUserData.userEmail;
      localStorage.licType = arrUserData.LicType;
      localStorage.clientID = arrUserData.clientID;
      localStorage.clientName = arrUserData.clientName;
      localStorage.clientShowSupport = arrUserData.clientShowSupport;
      localStorage.userAllowEditing = arrUserData.userAllowEditing;
      allowEditing = arrUserData.userAllowEditing;    //  Store for messaging...
      localStorage.clientAllowSharing  = arrUserData.clientAllowSharing;

      chrome.browserAction.setPopup({   //Sets popup to last visited
        popup: 'aSearch.html'   // Open this html file within the popup.
      });

      getContent();   //  Pull active libraries and their content

    },    //End async storage POST
    error: function (jqXHR, textStatus, errorThrown) {
      console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
    }
  });   //End Ajax
}   //End STARTUP

function getContent(){    //  Called from login AND web app looking to update...
  console.log('In getContent sub...');
  chrome.storage.sync.get('lastSave', function(obj) {
    var syncSaveTime = obj.lastSave;
    var localSaveTime = localStorage.lastSync;

    console.log('local: ' + localSaveTime + ' | sync: ' + syncSaveTime);

    //test - force pull from DB every time
    // if (localSaveTime == null || syncSaveTime <= localSaveTime || syncSaveTime == null){
    //production - check to see if pull from DB is required
    if ((localSaveTime == null || syncSaveTime == null) || syncSaveTime > localSaveTime){
      console.log("Local version is outdated...should run db pulll...");
      getLibraries('selected', setupLib1)
    }       //End process for running library load if outdated or NO data locally...
    else {
      console.log("We've got data - skip the heavyweight pull....use local");
      // processLibrary(arrLibrary, setupSearchPage3);
      // processLibrary(arrLibrary);
      setupLib2(JSON.parse(localStorage.arrLibrary));
    }
  });   //End sync storage pull to get lastsync
}

function setupLib1(arrSelectedLibrary){
  console.log('setupLib1 - passed arrSelectedLib and runs pull...') + console.log(arrSelectedLibrary);
  if (arrSelectedLib.length > 0){   //  Only pull data if there is a selection...
    pullLibrary(arrSelectedLibrary, setupLib2);
  } else {    //  No content...
    chrome.runtime.sendMessage({ msg: "gotoSearch"});
    refreshIframe();
  }
}


function setupLib2(arrLibrary){
  // console.log('+++++Back from pullLibrary...now process RAW library...and REFRESH iFrame...') + console.log(arrLibrary);
  processLibrary(arrLibrary, 'createSearch');
  chrome.runtime.sendMessage({ msg: "gotoSearch"});
  refreshIframe();
}

// Firebase auth popups
function googleLoginPopUp() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function(result) {
    // This gives you a Google Access Token. You can use it to access the Google API.
    var token = result.credential.accessToken;
    // The signed-in user info.
    var user = result.user;
    // ...
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    console.log(errorCode + ' - ' + errorMessage);
    chrome.runtime.sendMessage({ msg: "errorLogin", msgContent: errorMessage, msgSender: "Google"});
    // ...
  });
 }   //End Google Login

function getGoogleFileData(googleFileID){

  console.log('Checking Google Drive file details for fileID: ' + googleFileID);

  chrome.identity.getAuthToken({ 'interactive': true }, function(token) {

    console.log('In Chrome Identity and obtained token: ' + token + ' and logging pref set to: ' + arrUserData.userPrefChromeLog);

    if (token != null){

      $.ajax({
        type: "GET",
        beforeSend: function(request) {
          request.setRequestHeader("Authorization", "Bearer " + token);
        },
        url: "https://www.googleapis.com/drive/v3/files/" + googleFileID + "?fields=owners",
        dataType: 'json',
        processData: true,
        success: function(gDocsMeta1) {
          console.log('Got File Metadata: ') + console.log(gDocsMeta1);
          if(gDocsMeta1.owners[0].me === false){
            recipientID = gDocsMeta1.owners[0].emailAddress;
            recipientName = gDocsMeta1.owners[0].displayName;
            recipientPicUrl = gDocsMeta1.owners[0].photoLink;
            console.log(recipientID);
            console.log('I think this is the recipient-owner: ' + recipientName + ' with ID ' + recipientID + ' and photo link: ' + recipientPicUrl);
          } else {
            console.log('We will get the sharing user...');
            console.log('Wipe out the recipient variables - owner is ME and will wipe in case sharer is empty');
            recipientID = '';
            recipientName = '';
            recipientPicUrl = '';
            $.ajax({
              type: "GET",
              beforeSend: function(request) {
                request.setRequestHeader("Authorization", "Bearer " + token);
              },
              url: "https://www.googleapis.com/drive/v3/files/" + googleFileID + "?fields=sharingUser",
              dataType: 'json',
              processData: true,
              success: function(gDocsMeta2) {
                if (jQuery.isEmptyObject(gDocsMeta2) === false){
                  console.log('Sharing user: ') + console.log(gDocsMeta2);
                  if(gDocsMeta2.sharingUser.me === false){
                    recipientID = gDocsMeta2.sharingUser.emailAddress;
                    recipientName = gDocsMeta2.sharingUser.displayName;
                    recipientPicUrl = gDocsMeta2.sharingUser.photoLink;
                  }
                  console.log(recipientID);
                  console.log('I think this is the recipient-owner: ' + recipientName + ' with ID ' + recipientID + ' and phot0 link: ' + recipientPicUrl);
                } //  End check for array not empty
              },
              error: function (jqXHR, textStatus, errorThrown) {
                console.log('Google Drive Error - 2nd step: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
              }
            });
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('Google Drive Error - Step 1: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
          if (token.length > 0){    //Still have token - but need to remove.
            chrome.identity.removeCachedAuthToken({ token: token }, function(retry){
              console.log('Removed token...try again...for token: ' + token);
              updateRecipientID(activeURL);
            });
          }
        }
      });   //  End AJAX
    }  else {
        console.log('did not approve google drive - so turn off logging...');
        //Did not grant permission...turn logging off and pop message...
        token = '';   //  Wipe Token obtained from Google Drive
        var arrUserInfo = {
          userID: userID,
          fullName: '',
          userPrefWordInline: '',
          userPrefChromeLog: 0,
          userPrefChromeToolbar: arrUserData.userPrefChromeToolbar,
          sender: 'updateChromePrefs'
      }
      //  Now send update to aSearch to write to db...turn loggging off
      arrUserData.userPrefChromeLog = 0;
      localStorage.userDetails = JSON.stringify(arrUserData);
      console.log('Updating user prefs in web_background with: ') + console.log(arrUserInfo)
      $.ajax({
        type: 'post',
        url: baseURL + "updateUserDetail.php",
        data: { arrPost: JSON.stringify(arrUserInfo)},
          success: function (msgSuccess) {   // Details on selected libraries
            console.log('Updated your personal info...sender: ' + arrUserInfo.sender);
            if (arrUserInfo.sender === 'updateAllPrefs'){   // Decide whether to show confirmation msg
            }
            if (arrUserInfo.sender === 'updateAllPrefs'){
              var user = firebase.auth().currentUser;

              user.updateProfile({
                displayName: arrUserInfo.fullName
              }).then(function() {
                // Update successful.
              }).catch(function(error) {
                // An error happened.
              });
            }   //  End check for type of update - don't update name when setting a simple pref
          },   // End Success

          error: function (jqXHR, textStatus, errorThrown) {
            console.log('Error trying to update user prefs: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
          }

      });   //  End ajax for updateUserDetail.php
    } //  End check for token returned
  });   //  End Google Auth call
}   //  End Google File Meta Data sub

function facebookLoginPopUp() {
  var provider = new firebase.auth.FacebookAuthProvider();
  // provider.addScope('user_birthday');
  provider.addScope('email');
  firebase.auth().signInWithPopup(provider).then(function(result) {
    // This gives you a Facebook Access Token. You can use it to access the Facebook API.
    var token = result.credential.accessToken;
    // The signed-in user info.
    var user = result.user;
    // console.log('Facebook user info: ') + console.log(user);
    // ...
  }).catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorCode + ' - ' + errorMessage);
    chrome.runtime.sendMessage({ msg: "errorLogin", msgContent: errorMessage, msgSender: "Facebook"});
  });
}

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    console.log('Clicked context menu...' + info.menuItemId + ' using hosteditor: ' + hostEditor);

    if (info.menuItemId === "upsellMsg"){
      openAccount();    //  Open account page
    } else {
      var commentID = info.menuItemId.split("_").pop();   //ID is group_commentID so has to be split for searching
      // var commentID = info.menuItemId;   //ID is group_commentID so has to be split for searching

      var tempArray = JSON.parse(localStorage.arrLibrary);

    	console.log("Going to search array for commentID: " + commentID);

    	var obj = tempArray.filter(function ( obj ) {
    				return obj.comment_id === commentID;
    	})[0];

      obj.anno_fb_ext_id = '';      //  We don't have any special ID
      if (hostEditor === "canvasSpeedGrader"){
        obj.anno_fb_ext_sys_id = 1;      //  Indicates Speedgrader
      }
      else if (hostEditor === "googledocs"){
        obj.anno_fb_ext_sys_id = 2;      //  Indicates GoogleDocs
      } else {
        obj.anno_fb_ext_sys_id = 0;      //  Indicates unknown
      }

  //  ------------

    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //   activeURL = tabs[0].url;


    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var activeTab = tabs[0];
      activeURL = tabs[0].url;

      if (obj.currentText.includes("[[") === true){
         var wildcarURL;
         wildcarURL = "chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/modules/wildcard.html";
         wildCardPopup = window.open(wildcarURL, 'wildcard', 'height=480,width=780');
         // wildCardPopup.constructCommentDiv = constructCommentDiv;
         wildCardPopup.activeTabId = activeTab.id;
         wildCardPopup.obj2 = obj;
         wildCardPopup.context = 'chrome_ContextMenu';
         wildCardPopup.FROMLANG = 'en';
         wildCardPopup.TOLANG = 'en';
         wildCardPopup.DUALRESP = false;
         // wildcard.js calls recordFeedback...
      } else {
          // chrome.runtime.sendMessage({ msg: "saveFeedback", obj: obj2, source: context});
          chrome.tabs.sendMessage(activeTab.id, {method: "insertComment", comment:
          obj, activeURL: activeURL}, function(response) {
            try {
              console.log(response);
              if (response.response === 'inserted'){
                recordFeedback(obj,'chrome_ContextMenu', function(message){
                  console.log('Waiting on send to db...');
                  console.log(message);
                  if (message === "success"){
                    console.log("messaging a success...");
                    // port.postMessage({answer: "success"});
                  } else {
                    console.log("messaging a fail...");
                    alert("Apologies! Annotate PRO (AP) was not able to save your text to the cloud. Try refreshing this page or checking your Internet connection. Visit https://www.11trees.com/live/support/support-annotate-pro/ for help or to contact us.")
                  }
                });
              }
            } catch (err){
              console.log('Could not communicate with content script...' + err);
              alert("Annotate PRO was not able to insert text into the page - sorry! \n\nUsually this happens when you\'ve just installed AP but not yet refreshed any open web pages. Or we\'ve updated AP and your open pages have an outdated version.\n\nRefresh any open pages and try again.")
            }
          });
      }
    });
}   //  End ELSE for clicking a context menu that is not UPSELL
});       //End contextMenu onclick listener

function signOut() {
  console.log("Logging out via subroutine in background.js.");
  console.log('Deleting localStorage...');

  localStorage.removeItem('searchArray');
  localStorage.removeItem('licType');
  localStorage.removeItem('userDetails');
  localStorage.removeItem('userID');
  localStorage.removeItem('displayName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('clientID');
  localStorage.removeItem('clientName');
  localStorage.removeItem('days2go');

  localStorage.removeItem('activeLibrary');
  localStorage.removeItem('activeComment');
  localStorage.removeItem('arrLibrary');
  localStorage.removeItem('arrActiveLib');
  localStorage.removeItem('arrAvailableLib');
  localStorage.removeItem('arrSelectedLib');
  localStorage.removeItem('arrSelectedGroup');
  localStorage.removeItem('modalChoice');
  localStorage.removeItem('lastSync');
  localStorage.removeItem('toLang');
  localStorage.removeItem('fromLang');
  localStorage.removeItem('dualResp');
  localStorage.removeItem('showTB');

  localStorage.removeItem('clientAllowSharing');
  localStorage.removeItem('clientShowSupport');
  localStorage.removeItem('userAllowEditing');

  chrome.contextMenus.removeAll(function(){});						//blow away existing Annotate menu

   firebase.auth().signOut();
   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
     chrome.tabs.sendMessage(tabs[0].id, {method: "logOut"});
    });
   chrome.browserAction.setPopup({   //Sets popup to last visited
     popup: 'aHome.html'   // Open this html file within the popup.
   });
   //delete localstorage

}   //  End Signout function

//  Message from external web page
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
  console.log('Receiving message from web. Msg is: ' + request.msg);
  if (request.msg === "refreshWeb"){
    console.log('In background.js | refreshing context menus etc. based on edits via web.');
    getContent(function(){
      //Once content returned, refresh iFrame (toolbar)
      refreshIframe();
    });
    // recipientID = request.recipientID;
  } else if (request.msg === "logout"){
      console.log('In background.js | logging out of AP.');
      signOut();
      // recipientID = request.recipientID;
    }
});


chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "saveFeedback");
  port.onMessage.addListener(function(msg) {
    console.log('In background.js | trying to save feedback...from/for: ' + msg.source + ' / ' + ' using hostEditor: ' + hostEditor) + console.log(msg.obj);
    recordFeedback(msg.obj, msg.source, function(message){
      console.log('Waiting on send to db...');
      console.log(message);
      if (message === "success"){
        console.log("messaging a success...");
        port.postMessage({answer: "success"});
      } else {
        console.log("messaging a fail...");
        port.postMessage({answer: "fail"});
      }
    });
  });
});

chrome.runtime.onMessage.addListener(
  //Call from Extension page to refresh data...
  function(request, sender, sendResponse){
    // console.log('In background.js message listener...with message: ' + request.msg);

  // if (request.msg == "reactEvent") {
  //   console.log('Bg receiving message to run injected code with action: ' + request.action);
  //   // chrome.tabs.getSelected(null, function(tab){
  //   chrome.tabs.query({active: true}, function(){
  //     chrome.tabs.executeScript({code: "alert(document.querySelector('body'));"});
  //     console.log('bg and ???');
  //     });
  // }


  //  TODO: Remove this - not sending flags to background to remember SGid...
  // if (request.msg == "newSGcommentFlag") {
  //   console.log('In background.js | msg received to set newSGcommentFlag to: ' + request.newCommentFlag + ' for sgID: ' + request.sgID);
  //   // if (request.action === "check"){
  //   //   console.log('Checking newCommentFlag: ' + newCommentFlag);
  //   //   sendResponse(newCommentFlag);
  //   // }
  //   if (request.action === "set"){
  //     console.log('Setting newCommentFlag. Was: ' + newCommentFlag);
  //     console.log('Potentially a new sgID. Was: ' + speedGraderID + ' and now will be: ' + request.sgID);
  //     if (speedGraderID !== request.sgID && speedGraderID !== 'startup'){
  //       console.log('Must be on a new SG comment...so increment so we trigger save...');
  //       newCommentFlag = 2;
  //     }
  //     speedGraderID = request.sgID;   //  update var in background.js to track which comment
  //     var newSGcommentCheck = newCommentFlag - request.newCommentFlag;
  //     console.log('Check for send: ' + newSGcommentCheck);
  //     newCommentFlag = request.newCommentFlag;
  //     console.log('Setting newCommentFlag. NOW: ' + newCommentFlag);
  //     if (newSGcommentCheck === 1){
  //       //  Logic: if it was SET to 1, and we are now OFF (therefore zero), then 1-0 = 1 and we should send...
  //       console.log('We should send SG comment...');
  //       sendResponse({sgFlagUpdateResponse: "sendSGcomment"});
  //     } else {
  //       console.log('We should NOT send SG comment...');
  //       sendResponse({sgFlagUpdateResponse: "doNothing"});
  //     }
  //   }
  // } else
  if (request.msg == "googleLoginPopUp") {
      console.log('In background.js | msg received to run googleLoginPopUp');
      googleLoginPopUp();
    }
    else if (request.msg == "facebookLoginPopUp") {
      console.log('In background.js | msg received to run facebookLoginPopUp');
      facebookLoginPopUp();
    }

    else if (request.msg == "signOut"){
      console.log('In background.js | msg received to sign out');
      signOut();
      sendResponse({signout: "signedout"});
      return true;        // <-- Required if you want to use sendResponse asynchronously!

    } else if (request.msg === "copy2clipboard"){
      var commentSB = request.comment;
      console.log('Put selection into hidden div and copy to clipboard...' + commentSB);
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {method: "showCommentSB", comment: commentSB});
      });
    } else if (request.msg == "focusIframe"){
      console.log('In background.js | msg received to focus on iFrame...');
      focusIframe();
      return true;        // <-- Required if you want to use sendResponse asynchronously!
    } else if (request.msg == "updateUserName"){
      console.log('In background.js | msg received to update user name');

      var user = firebase.auth().currentUser;

      user.updateProfile({
        displayName: request.name
      }).then(function() {
        // Update successful.
      }).catch(function(error) {
        // An error happened.
      });
      sendResponse({updateName: "Updated!"});
      return true;        // <-- Required if you want to use sendResponse asynchronously!
    }

    // else if (request.msg === "saveFeedback"){
    //   console.log('In background.js | trying to save feedback...from/for: ' + request.source + ' / ' + ' using hostEditor: ' + hostEditor) + console.log(request.obj);
    //   recordFeedback(request.obj, request.source, function(message){
    //     console.log('Waiting on send to db...');
    //     console.log(message);
    //     if (message === "success"){
    //       console.log("messaging a success...");
    //       port.postMessage({answer: "success"});
    //     } else {
    //       console.log("messaging a fail...");
    //       port.postMessage({answer: "fail"});
    //     }
    //   });
    // }

    //  Canvas generates recipID in background.js; only Civitas sends from content.js
    else if (request.msg === "saveRecipient"){
      console.log('In background.js | saving recipient ID to background storage: ' + request.recipientID);
      recipientID = request.recipientID;
    }

    else if (request.msg === "saveAssignCourse"){
      console.log('In background.js | saving course and assignment details: ') + console.log(request.arrData);
      arrCourseAssign = request.arrData;
    }

    else if (request.msg === "startup") {
      console.log('In background.js | msg received to run startup' + request.name +  request.mail + request.uid);
      startup(request.name, request.mail, request.uid, function(){
        console.log('Handing off to startup in background.js...');
        chrome.runtime.sendMessage({ msg: "gotoSearch"});
      });
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "pullProcessLibrary") {    //  Called by aSearch.js, editLibrary.js
      console.log('In background.js | msg received to pull library for process ' + request.lib + ' and context ' + request.context);

      pullLibrary(request.lib, function(arrLibrary, setupProcessLib){
        console.log('Back from pull and process - now message to popup to continueEEE...waiting for completion before returning msg with context: ' + request.context);
        processLibrary(arrLibrary, request.context, function(tempArrLibrary, tempArrSelectedGroup){
          console.log('Trying to send arrLibrary back to caller...') + console.log(tempArrLibrary) + console.log(tempArrSelectedGroup);
          sendResponse({arrLibrary: tempArrLibrary, arrSelectedGroup: tempArrSelectedGroup});
        });
      });
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "getRecip") {    //  Called by aSearch.js
      //  Just returns whatever value background.js has in global memory - can be blank
      console.log('In background.js | msg received to get recipientID: ' + recipientID);
          sendResponse(recipientID);
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg == "closeSidebar1") {
      console.log('In background.js | asking to close sidebar');
      //  Now message content script to close
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {method: "closeSidebar2"});
      });
    }

    else if (request.msg == "showSGfullscreenTB1") {
      console.log('In background.js | asking to show SG full screen toolbar - so hide regular TB and button');
      if (request.action === "open"){
        console.log('In bkground and asking to open FS SG toolbar - so hide regular ones...');
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {method: "sgFullScreenTB", action: "hideregular"});
      });
    } else if (request.action === "close"){
      console.log('In bkground and asking to CLOSE FS SG toolbar - so show regular ones...');
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {method: "sgFullScreenTB", action: "showregular"});
      });
    }
    }

    else if (request.msg === "updateUserPrefs") {    //  Called by aSearch.js, editLibrary.js
      if (request.log > 0){
        activeURL = '';   //  Wipe so that a refresh of page will check for history
      }
      arrUserData.userPrefChromeLog = request.log;
      arrUserData.userPrefChromeToolbar = request.toolbar;
      if (request.log === 0){
        recipientID = '';     //  Null it out...
      }
      console.log('In background.js | msg received to update user Prefs - logging/toolbar: ' + request.log +' / ' + request.toolbar);
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "activeElementID") {    //  Called by content script to record the real active URL
      // console.log('In background.js | msg received to set/check activeElement: ' + request.action);
      if (request.action === "check"){
        // console.log('Checking activeElement: ' + activeElement);
        sendResponse(activeID);
      }
      if (request.action === "set"){
          if (request.id != 'annotatePROtoolbar' && request.id != 'annotatePROsidebar'){
          // console.log('NOT the AP toolbar: setting - activeElementID and related data. Hosteditor: ' + request.hostEditor);
          hostEditor = request.hostEditor;    //  Set global hostEditor value
          //  Do NOT update ID if we've clicked Annotate!
          //  For Google Docs - to avoid wiping the elementID
          if (request.origin !== "iframe"){
            //  Wipe previous value - really just to get rid of linkdialog-onweb-tab-input, the Google Mail link things
            //  You spent too much time on this
            activeID = '';
          }

          if (activeID === 'linkdialog-onweb-tab-input' && request.origin === "iframe"){
          // if (activeURL.includes("mail.google.com") === false && request.id !== ''){
            //  Do NOT update elementID if we're coming from Google Mail 'add a link' dialog
            console.log('Skipped setting activeElID...');
          } else {
            activeID = request.id;
            if (request.url.includes("https://docs.google.com/document" && arrUserData.userPrefChromeLog === 1)){
              googleFileID = getIdFromUrl(request.url);
              console.log("google file iD: " + googleFileID);
              // getGoogleFileData(googleFileID);      //  Call ajax to run Google Drive api
            }
            // console.log('BACKGROUND COMPLETED: Set activeelementID: ' + request.id);
          }
        }
      }
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "recipName") {    //  Called by content script to record the user's name (Canvas...)
      // console.log('In background.js | msg received to set/check activeElement: ' + request.action);
      if (request.action === "check"){
        // console.log('Checking activeElement: ' + activeElement);
        sendResponse(recipientName);
      }
      if (request.action === "set"){
        console.log('BACKGROUND: set the value of recipient name: ' + request.name);
        recipientName = request.name;
      }
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }


    else if (request.msg === "recipAvatarURL") {    //  Called by content script to record the user's avatar URL
      // console.log('In background.js | msg received to set/check activeElement: ' + request.action);
      // console.log('Checking activeElement: ' + activeElement);
      console.log('BACKGROUND: set the value of recipient avatar URL: ' + request.url);
      recipientPicUrl = request.url;
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "refreshIframe") {    //  Called by aSearch to refresh toolbar
      console.log('In background.js | msg received to refresh the iFrame toolbar: ' + request.msg);
      refreshIframe();
      return true;
    }

    else if (request.msg === "checkLoginStatus") {    //  Called by content script to record the real active URL
      // console.log('In background.js | msg received to get TOOLBARPREF... ');
        arrUserData = JSON.parse(localStorage.userDetails);
        sendResponse({userID: userID, toolbarPref: arrUserData.userPrefChromeToolbar });
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "checkLoggingPref") {    //  Called by content script to record the real active URL
      // console.log('In background.js | msg received to check whether we are logging manual feedback... ');
        arrUserData = JSON.parse(localStorage.userDetails);
        sendResponse({loggingPref: arrUserData.userPrefChromeLog});
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }

    else if (request.msg === "getLibraries") {    //  Called by editLibraries.js
      console.log('In background.js | msg received to getLibraries with action: ' + request.action);

      getLibraries(request.action, function(arrTempLibrary, setupProcessLib){
        //  what is setupProcessLib doing? There is no sub called that...
        sendResponse(arrTempLibrary);
      });
      return true; // <-- Required if you want to use sendResponse asynchronously!
    }
  }   //End function handling messaging...
);

function focusIframe(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log('Now tell search toolbars to focus on iFrame & search...');
    chrome.tabs.sendMessage(tabs[0].id, {method: "focusToolbar"});
  });
}

function refreshIframe(){
  // console.log('In sub to refresh iframe - please run once.');
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log('Now forward msg to content script...to refresh the iFrame...');
    chrome.tabs.sendMessage(tabs[0].id, {method: "refreshIframeTB"});
  });
}

//------ LIBRARY PROCESSING START -----
function getLibraries(list, callback){
  console.log('getLibraries sub... ------------------- for list: ' + list);

  // arrInsertName = [];

  var url1 = baseURL + '1getLibraries.php';
  var url2 = '&userID=' + userID + '&licType=' + licType + '&clientID=' + clientID + '&sender=available';

  $.ajax({
    type: 'POST',
    url: url1,
    data: url2,
    // dataType: 'text',
    dataType: 'json',
    success: function (arrTwoArrays) {

      var currentTime = new Date();
      var subTime;   //  Hold subscription expiration time for a LIBRARY

      console.log('2 arrays: user licensing + LONG list of AVAILable libraries-------------------> ') + console.log(arrTwoArrays);

      // console.log(arrTwoArrays.userLicense);
        //  Contains licType and days2go before trial over
        //  If days2go = '' then trial is over
      licType = arrTwoArrays.userLicense[0];
      localStorage.licType = licType;
      localStorage.days2go = arrTwoArrays.userLicense[1];

      var arrResult = arrTwoArrays.libraries;   //  array of arrays / available libraries

      var currentTime = new Date();
      var subTime;   //  Hold subscription expiration time for a LIBRARY

      // console.log('LONG list of AVAILable libraries-------------------> ') + console.log(arrResult);

      // First, get just the library_ids from the array
      var listLibID = [];
      $.each(arrResult,function(i, availLib){
        listLibID.push(availLib.library_id);
      });

      // console.log('Simplified list of Lib IDs: ') + console.log(listLibID);

      //  Next, count duplicates. If a library is shared within a client by another user, it will appear 2 times after another user adds that library
      var result = listLibID.reduce(function(p,c){
        if(p[c] === undefined)
        p[c] = 0;
        p[c]++;
        return p;
      },{});


      // console.log('Unique Lib IDs: ') + console.log(result);

      // console.log('Length of core array before processing (9?): ' + arrResult.length);

      //  Finally, loop through the list of arrays with more than one entry and remove the user-shared version so we don't display it twice
      var statusFlag;
      //  0: duplicate
      //  10: authored by current user
      //  20: shared with current user - by a colleague (informal)
          // _library_active of 2 with clientID = current user clientID and user_id <> 0
      //  21: shared with current user - by Exec Editor (formal)
          // _library_active 3 with clientID = current user clientID and user_id <> 0
      //  30: licensed by 11trees as a part of an institutional licenseMsg
          //  anno_user_library.user_id = 0 + active = 3
      //  40:  licensed by current user
          //  purchase_status = 1 + anno_user_library.user_id = userID + clientID = 0
      //  41: licensed by institution from 11trees and added by current user

      //  50:  Available from 11trees to license
          // _library_active of 3 with clientID = current clientID
      //  60: WAS licensed by not any longer
          //  anno_user_library.user_id = userID + clientID = 0 && (purchase_status = 1 || out of date)

      $.each(arrResult, function(j){
        // console.log('Sub time: ' + arrAvailableLib[j].user_library_subscription_date);

        if ((arrResult[j].user_library_subscription_date) != " 0000-00-00 00:00:00"){
          subTime = new Date(arrResult[j].user_library_subscription_date);
        }


        $.each(result, function(i, countLib){
          //  Takes RESULT array and walks through the values...loking for libID with more than one instance
          //TODO: I don't think I need to do date stuff here - getLibraries.php blocks any libraries that are out of subscription (for individual users)
          if (i == arrResult[j].library_id){
            // console.log('On ' + i + ' with count ' + countLib + ' and availability: ' + arrResult[j].user_library_library_active + ' and library client ' + arrResult[j].client_id + ' user client ' + clientID);
            // console.log('Times: ' + subTime + ' / ' + currentTime);

            // console.log('Author / user ID: ' + arrResult[j].library_author_id + ' / ' + userID + ' typeof: ' + typeof "userID" + ' / ' + typeof "arrAvailableLib[j].library_author_id");

            // Remove from array if:
            //  library_active > 1 (which means shared)
            //  user_id of anno_user_library row is <> current userResults
            //  count > 1 (more than one instance)
            //  So we keep the version authored by the current user OR the one with current user in the anno_library_detail user_id value
            // if(arrAvailableLib[j].user_library_library_active > 1 && arrAvailableLib[j].user_id != userID && countLib > 1){
            if(arrResult[j].user_id != userID && countLib > 1){
              //  If there are more than 1 instances of a specific Library, any with a library_active > 1 will be dupes: shared by others UNLESS it's available to purchase and therefore will have user_id = 0.
              statusFlag = 0;
              // console.log('Going to remove this one...' + i);
            } else if(arrResult[j].library_author_id == userID){
              statusFlag = 10;
              // console.log('Authored by current user. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].library_author_id != userID && arrResult[j].user_library_library_active == 2){
              statusFlag = 20;
              // console.log('Shared with user by colleague - informal. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].library_author_id != userID && arrResult[j].user_library_library_active == 3){
              statusFlag = 21;
              // console.log('Shared with user by Exec Editor - formal. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].user_id == 0 && arrResult[j].user_library_library_active == 3){
              statusFlag = 30;
              // console.log('Licensed from 11trees as part of institutional relationship. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].library_author_id != userID && arrResult[j].library_author_id != 5322 && arrResult[j].user_id == userID && arrResult[j].user_library_purchase_status == 0){
              statusFlag = 40;
              // console.log('Added from share by user. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].library_author_id === 5322 && arrResult[j].user_id == userID){
              statusFlag = 41;
              //  TODO: does this need additional logic - filter by client_id = 5 also?
              // console.log('Added from share by 11trees to institution. Cannot be clientID 5. StatusFlag: ' + statusFlag);
            } else if(arrResult[j].user_library_purchase_status == 1 && subTime > currentTime && arrResult[j].user_id == userID){
              statusFlag = 50;
              // console.log('Licensed by current user directly. StatusFlag: ' + statusFlag);
              // } else if(arrAvailableLib[j].user_library_library_active == 4){
              //     statusFlag = 6;
              //     console.log('Available for individual license. StatusFlag: ' + statusFlag);
              // } else if((arrAvailableLib[j].user_library_purchase_status == 0 || subTime < currentTime) && arrAvailableLib[j].user_library_library_active == 4){
            } else if((arrResult[j].user_library_purchase_status == 1 && subTime < currentTime) || (arrResult[j].user_library_purchase_status == 0 && arrResult[j].user_library_library_active == 4)){
              statusFlag = 60;
              // console.log('Available for individual license OR WAS licensed by individual user - lapsed. StatusFlag: ' + statusFlag);
            } else {
              console.log('Leftover lib: ') + console.log(arrResult[j]);
            }
          }
          arrResult[j].status = statusFlag;
        });
      });

      arrAvailableLib = $.grep(arrResult, function(lib){ // just use arr
        return lib.status > 0;
      });

      //  Order libraries alphabetically -- unnecessary...php query does this
      // arrAvailableLib.sort(function(a, b) {
      //   return parseFloat(a.library_name) - parseFloat(b.library_name);
      // });

      arrActiveLib = $.grep(arrAvailableLib, function(lib){ // just use arr
        // if (lib.dupe == 0 && lib.user_library_library_active > 0){
        if (lib.user_library_library_active > 0 && lib.status != 20 && lib.status < 50 ){
          return true;
        }
      });

      arrSelectedLib = $.grep(arrActiveLib, function(lib){ // just use arr
        return lib.user_library_selected == 1;
      });

      // console.log('List of Available Libs: ') + console.log(arrAvailableLib);
      // console.log('List of Active Libs: ') + console.log(arrActiveLib);
      console.log('BACKGROUND - List of SELECTED Libs: ') + console.log(arrSelectedLib);

      localStorage.arrSelectedLib = JSON.stringify(arrSelectedLib);    //  Store for use elsewhere

      localStorage.arrActiveLib = JSON.stringify(arrActiveLib);    //  Store for use elsewhere

      localStorage.arrAvailableLib = JSON.stringify(arrAvailableLib);
      // console.log('List of AVAILable, unique libraries - stored in localStorage-------------------> ') + console.log(tempArrAvailLib);

      //  Now store available GROUPS for use in other
      var tempGroupQuery;

      $.each(arrAvailableLib,function(i, groupQuery){
        // console.log('Cycling through Groups to create available Group list: ' + groupQuery.library_name);
        //  Treats first library_id differently than subsequent ones - to chain the logic
        if (i === 0){tempGroupQuery = '(anno_library.library_id = ' + groupQuery.library_id + ' AND (anno_group.group_author_id = anno_library.library_author_id or anno_group.group_author_id = ' + userID + '))';}
        if (i > 0){
          tempGroupQuery = tempGroupQuery + ' OR ' + '(anno_library.library_id = ' + groupQuery.library_id + ' AND (anno_group.group_author_id = anno_library.library_author_id or anno_group.group_author_id = ' + userID + '))';
        }
      });

      if (list === 'available'){
        // console.log('Return available...');
        callback(arrAvailableLib);   //ajax is complete - go back to whoever invoked you!
      } else if (list === 'active'){
        // console.log('Return active...');
        callback(arrActiveLib);   //ajax is complete - go back to whoever invoked you!
      } else if (list === 'selected'){
        // console.log('Return selected...');
        callback(arrSelectedLib);   //ajax is complete - go back to whoever invoked you!
      }

    },   // End Success of get avail...

    error: function (jqXHR, textStatus, errorThrown) {
      console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
    }

  });   //  End ajax

  // return arrAvailableLib;

}   //  End GET libraries (avail, active, selected)

function pullLibrary (arrClickedLib, callback) {

    // console.log('Starting PULL with: ') + console.log(arrClickedLib);

    var templibIDquery;

    console.log('STARTING pullLibrary...');

    //  Pulls ALL group_detail rows that match the library (by its author) and the current user. So have to remove original versions from the array if the user has modified (creating their own row in anno_user_comment). This work done in processLibrary.

    if (arrClickedLib.length > 0){

        $.each(arrClickedLib,function(i, libIDquery){
          //  Treats first library_id differently than subsequent ones - to chain the logic
          if (i === 0){templibIDquery = '(anno_library.library_id = ' + libIDquery.library_id + ' AND (anno_group.group_author_id = ' + libIDquery.library_author_id + ' or anno_group.group_author_id = ' + userID + ') AND (anno_group_detail.group_detail_author_id = ' + libIDquery.library_author_id + ' OR anno_group_detail.group_detail_author_id = ' + userID + ') AND (anno_comment.comment_author_id = ' + libIDquery.library_author_id + ' OR anno_comment.comment_author_id = ' + userID + '))';}
          if (i > 0){
            templibIDquery = templibIDquery + ' OR ' + '(anno_library.library_id = ' + libIDquery.library_id + ' AND (anno_group.group_author_id = ' + libIDquery.library_author_id + ' or anno_group.group_author_id = ' + userID + ') AND (anno_group_detail.group_detail_author_id = ' + libIDquery.library_author_id + ' OR anno_group_detail.group_detail_author_id = ' + userID + ') AND (anno_comment.comment_author_id = ' + libIDquery.library_author_id + ' OR anno_comment.comment_author_id = ' + userID + '))';
          }
        });

          var url1 = baseURL + 'getUserComments.php';
          var url2 = '&userID=' + userID + '&licType=' + licType + '&sender=' + 'editLibrary' + '&library_logic=' + templibIDquery;


        $.ajax({
          type: 'POST',
          url: url1,
          data: url2,
          // dataType: 'text',
          dataType: 'json',
          success: function (result) {
          // success: function(responseJSON){
            arrLibrary = result;    //store for use on this page
            // console.log('Saving Entire Library: ') + console.log(arrLibrary);
            // localStorage.library = JSON.stringify(result);    //Store for use elsewhere

            //Now mark last update to both sync storage and local storage so access from other browsers will know to pull data from server or just use local arrays (to save resources)
            var timeStamp = Date.now();
            localStorage.lastSync = timeStamp;

            // console.log('Last update: ' + localStorage.lastSync);

            // console.log('Settings saved and raw library downloaded - handing off to callback...');
            callback(arrLibrary);      //  processLibrary
          },   //End Success

            error: function (jqXHR, textStatus, errorThrown) {
              console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
              $('#flexModalHeader').html('Can\'t access the 11trees\' servers...');
              $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We\'re sorry...we can\t connect to the 11trees server to check your account. Are you on the internet? <p></p>Here's the error code: " + errorThrown + "</p><p></p><p>Feel free to contact us via our <a href='http://www.11trees.com/live/support'>support pages</a></p>");
              $('#flexModal').modal('show');
            }

        });   //  End ajax
    }   else {       //  End test for user libraries selected...
          $('#ddLibName').append($("<option data-container='#ddLibrarySelect'\
          value='none' disabled>Please create a Library or activate one...</option>"));
          //  Close spinner here
          $('#flexModalHeader').html('No Libraries Selected');
          $('#flexModalMsg').html('To use Annotate PRO select an existing Library or create a new one.');
          $('#flexModal').modal('show');
    }   //  End IF for checking whether any libraries were selected
} // End pullLibrary

function processLibrary(arrLibrary, context, callback){
  // console.log("Starting to process LIBRARY array for popup and editLibrary pages..." + "User: " + userID + " License: " + licType) + console.log(arrLibrary);

  //  Step 1: process all comments to account for user customized entries - removing library author duplicates from group_detail if there is a current user row

  // First, get just the comment_ids from the array
  var listCommentID = [];
   $.each(arrLibrary,function(i, activeComment){
     listCommentID.push(activeComment.comment_id);
   });

  //  console.log('Simplified list of Comment IDs: ') + console.log(listCommentID);

   //  Next, count duplicates. If a Comment appears twice it is because current user has modified active, favorite, order, or the label/text

   var result = listCommentID.reduce(function(p,c){
     if(p[c] === undefined)
       p[c] = 0;
     p[c]++;
     return p;
   },{});

   var deleteFlag;
   var label;
   var libSub;     //  1 for subscribed, 0 for out of sub
   var currentTime = new Date();
   var subTime;   //  Hold subscription expiration time for a LIBRARY

     console.log('------>Processing library with ') + console.log(arrLibrary);
     console.log('------>Selected libraries ') + console.log(arrSelectedLib);

       $.each(arrLibrary, function(j, comment){
         arrCurrentLib = $.grep(arrSelectedLib, function(selLib){ // just use arr
           // console.log(selLib);
           // console.log(arrLibrary[j]);
           return selLib.library_id == arrLibrary[j].library_id ;
         //   return lib.duplicate == 0 || ( lib.duplicate == 1 && lib.client_id == 0);
         });
         // console.log('Current library being worked on: ') + console.log(arrCurrentLib);
         if (arrCurrentLib[0].user_library_subscription_date != " 0000-00-00 00:00:00"){
           subTime = new Date(arrCurrentLib[0].user_library_subscription_date);
         }

        //1) mark any doubles for duplication if appropriate (vs. list of singular IDs)
        $.each(result,function(i, countCom){   //  Takes RESULT array of single comment_ids and walks through the values...loking for libID with more than one instance
           if (i === arrLibrary[j].comment_id){
           //  console.log('On ' + i + ' with value ' + countCom);
             if(arrLibrary[j].group_detail_author_id != userID && countCom > 1){
                //  If there are two group_detail rows for this Commment, indicating current user has modified, then use the user's version not the original author's
                // console.log('Delete this comment from library...') + console.log(arrLibrary[j]);
                deleteFlag = 1;
                arrLibrary[j].dupe = deleteFlag;
               //  console.log('Going to delete this one...' + deleteFlag);
             } else {
               deleteFlag = 99;
               // console.log('SAVE this comment from library...') + console.log(arrLibrary[j]);
               arrLibrary[j].dupe = deleteFlag;
             }
           }
         });  //  End loop through list of singular comment ids

        //  2) Now mark comments for dupe = 1 where appropriate
        // console.log('Current lib sub date1: ' + arrCurrentLib[0].user_library_subscription_date);
        // console.log('Current lib sub date2: ' + subTime);
        // console.log('Current time: ' + currentTime);
        // console.log('Current commentID: ' + comment.comment_id);
          if (subTime < currentTime && comment.comment_author_id != userID){
                console.log('Delete this comment from library...');
                deleteFlag = 1;   //  Delete because NOT author and sub date passed
             } else {   //  Process comments we want to keep
               deleteFlag = 0;    // Keep this one and now worth processing it further...
               if(comment.user_comment_use_custom > 0){
                 label = comment.custom_comment_label  + ": " + comment.custom_comment_text.substring(0, 25) + "...";
                 arrLibrary[j].currentLabel = comment.custom_comment_label;
                 arrLibrary[j].currentText = comment.custom_comment_text;
               } else {
                 label = comment.comment_label  + ": " + comment.comment_text.substring(0, 25) + "...";
                 arrLibrary[j].currentLabel = comment.comment_label;
                 arrLibrary[j].currentText = comment.comment_text;
               }
               if (comment.user_comment_favorite) {arrLibrary[j].userFavorite = comment.user_comment_favorite;}
               else {arrLibrary[j].userFavorite = comment.group_detail_comment_favorite;}

               var tooltipText;

               if (arrLibrary[j].currentText.length > 144){
                 tooltipText = arrLibrary[j].currentText.substring(0,144);
                 tooltipText = tooltipText.trim() + '...';
               } else {
                 tooltipText = arrLibrary[j].currentText;
               }
               tooltipText = tooltipText.replace("\"","&quot;");   //  Replace double quotes
               tooltipText = $("<div>").html(tooltipText).text();   //Remove HTML
               arrLibrary[j].tooltipText = tooltipText;

              //  console.log('Processed tooltip: ' + tooltipText);

               var displayLabel = arrLibrary[j].currentLabel.toUpperCase() + ' | ' + arrLibrary[j].tooltipText;

             }    //  End processing of comments we want to keep

            if (arrLibrary[j].dupe === 99){
               arrLibrary[j].dupe = deleteFlag;   //  write dupe logic to comment
            }
       });    //  End loop through each comment in library

  // This is handled during zip through Groups to create DDs.
  console.log('Before removing dupes: ') + console.log(arrLibrary);
  arrLibrary = $.grep(arrLibrary, function(com){ // just use arr
    return com.dupe == 0;
    //   return lib.duplicate == 0 || ( lib.duplicate == 1 && lib.client_id == 0);
  });
  console.log('After removing dupes / pristine library: ') + console.log(arrLibrary);

  // localStorage.library = JSON.stringify(arrLibrary);     //  Now that it's cleaned up, store

  //  End Step 1: removing duplicate group_detail rows

  //  ------------------- only continue if full reset -----------------
  if (context === 'createSearch'){      //  Only run this chunk of code if called from search page...not edit page

    //  Step 1a: Get list of unique Groups in selection
    //  Process to eliminate duplicates ----/

    var lookupObject  = {};

    arrSelectedGroup =[];   //  Empty out in preparation for filling with new Active Groups

    //  Get unique list of groups ----/
    $.each(arrLibrary,function(i, comment){
       lookupObject[arrLibrary[i].group_id] = arrLibrary[i];
    });

    $.each(lookupObject,function(i, group){
        arrSelectedGroup.push({libraryID: group.library_id, libraryExtensible: group.library_extensible, group_id: group.group_id, groupAuthor: group.group_author_id, group_name: group.group_name, groupDesc: group.group_desc, groupActive: group.library_detail_group_active, groupOrder: group.library_detail_group_order});
    });

    arrSelectedGroup.sort(function(a, b) {
      return parseFloat(a.groupOrder) - parseFloat(b.groupOrder);
    });

    // console.log('Selected comment groups array after sort: ') + console.log(arrSelectedGroup);

    localStorage.arrSelectedGroup = JSON.stringify(arrSelectedGroup);
    //  Store list of ACTIVE Comment Groups
    //  End Step 1a: Unique Groups (arrSelectedGroup)

    //  Step 1b: (Chrome only): contextMenu set up

    // console.log('Context menu setup with arrSelectedLib: ') + console.log(arrSelectedLib);

    var contexts = ["editable"];
    var label;

    chrome.contextMenus.removeAll();						//blow away existing Annotate menu

    arrSelectedLib = JSON.parse(localStorage.arrSelectedLib);   //  This may be updated by web_background

    //Create basic contextMenus - for appending later...
    chrome.contextMenus.create({"title": "Annotate PRO", "id": "annotate", "contexts": ["page", "selection", "editable"]	});

    if (arrSelectedLib.length > 1){   //  If more than one library, nest library choices
      $.each(arrSelectedLib,function(i, lib){
        chrome.contextMenus.create({    //  create main contextMenu entry for a Group
          "title": lib.library_name,
          "parentId": "annotate",
          "id": 'lib_' + lib.library_id.toString(),          //as we loop through, create a context menu for each LIBRARY
          "contexts": ["page", "selection", "editable"]
        });
      });   //  End each for libraries
    }   //  End check for multiple libraries selected
    //  End Step 1b - contextMenu setup

    //  Step 2: Process each unique group to context menus. In Chrome, Faves etc. created in aSearch.js

    // console.log('The SELECTED groups I\'ll use: ') + console.log(arrSelectedGroup);

    var arrTempFave = [];   //  Hold array of JUST faves - to create dedicated buttons
    var faveLabel;

    $.each(arrSelectedGroup,function(i, group){      //Cycle through each group of Comments
      // console.log('Processing each group...') + console.log(arrSelectedGroup);

      //  Step 2b: Create individual arrays for each Comment Group and store in localStorage

      //  Use GREP to create subset Array holding one Group's worth
      var arrTempGroup = [];    //to hold an array for one comment group
      arrTempGroup = $.grep(arrLibrary, function(n, i){ // just use arr
        // if (n.group_id == group.groupID && group.groupActive > 0){
          // return true;
      //  }
        return n.group_id == group.group_id;    //  Logic before filtering for active
      });

      // console.log('UNsorted Group Object: ') + console.log(arrTempGroup);
      //  Order comments in ID order - oldest at top until we build sorting
      arrTempGroup.sort(function(a, b) {
          return parseFloat(a.group_detail_comment_order) - parseFloat(b.group_detail_comment_order);
      });
      // console.log('Sorted Group Object: ') + console.log(arrTempGroup);

      var parentMenuID;

      if (arrSelectedLib.length > 1){   //  Create nested choices
        parentMenuID = 'lib_' + group.libraryID.toString();
      } else {
        parentMenuID = 'annotate'
      }

      if (group.groupActive > 0){
        chrome.contextMenus.create({    //  create main contextMenu entry for a Group
          "title": group.group_name,
          "parentId": parentMenuID,
          "id": group.group_id,          //as we loop through, create a context menu for each Group
          "contexts": ["page", "selection", "editable"]
        });
      }

      $.each(arrLibrary, function(i, comment){
        if (comment.currentLabel == ''){
          // console.log('Working on Group: ' + group.group_name + ' and Comment: ' + comment.comment_id);
        }

        if(comment.group_id == group.group_id && comment.group_detail_comment_active == 1 && comment.currentLabel != '' && group.groupActive > 0){     //  Check for blank labels - skip if blank; make sure group active

          chrome.contextMenus.create({
            "title": comment.currentLabel,
            "parentId": group.group_id,
            // "id": gName + '_' + idIndex.toString(),								//commentObject.saveLocation,
            "id": group.group_id + '_' + comment.comment_id,								//commentObject.saveLocation,
            // "id": comment.comment_id,								//commentObject.saveLocation,
            "contexts": ["page", "selection", "editable"]
          });

          //  Create favorites array (if paid/trial user)
          if (comment.group_detail_comment_favorite > 0){    //Add contextMenu favorites; BUTTONs are created in aSearch.js
            if (comment.currentLabel.length > 25){
              faveLabel = comment.currentLabel.substring(0,25)
              faveLabel = faveLabel.trim() + '...';
              // console.log('Favorite label: ' + faveLabel + ' / ' + comment.currentLabel.length);
            } else {
                faveLabel = comment.currentLabel;
            }
              // arrTempFave.id = "fave_" + comment.comment_id;
              arrTempFave.push({
                faveLabel: faveLabel,
                id: 'fave_' + comment.comment_id
              });
          }   //  End IF favorite

        }   //  End IF for a Comment's Group matching current Group
      });   //  End Loop through Library for a specific Group

    });   // END loop for each GROUP

    // console.log('Now build fave entries with array: ') + console.log(arrTempFave);

    if (arrTempFave.length > 0){      //  Only run if Fave is NOT empty
      var i = 0;    //  Counter for freebie users...

      // console.log('Before sort...Faves:') + console.log(arrTempFave);
      //  Sort faves...
      arrTempFave.sort(function(a, b) {
        var aName = a.faveLabel.toLowerCase();
        var bName = b.faveLabel.toLowerCase();
        return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
      });
      // console.log('After sort...') + console.log(arrTempFave);

      // TODO: 8/8/18: removed limit on free...
      // console.log('Not a freebie we hope...with i: ' + i);
      // if (licType == 1) {
      //   console.log('Freebie...');
      //   var increment = 1;
      // } else {
      //   console.log('Paid...');
      //   var increment = 0;
      // }
      if (licType === 1){     //  Append purchase if licType = 1
        chrome.contextMenus.create({
          "parentId": 'annotate',
          "type": 'separator',
          "contexts": ["page", "selection", "editable"],
        });

        chrome.contextMenus.create({
          "title": 'License Annotate PRO...',
          "parentId": 'annotate',
          "id": 'upsellMsg',								//commentObject.saveLocation,
          "contexts": ["page", "selection", "editable"],
          // "onclick": function(info, tab)
          // {
          //   openAccount();    //  Open account page
          //   // var address = "https://www.11trees.com/live/annotate-pro-pricing/";
          //   // chrome.tabs.create({'url': address});
          // }
        });
        chrome.contextMenus.create({
          "parentId": 'annotate',
          "type": 'separator',
          "contexts": ["page", "selection", "editable"],
        });
      }

      $.each(arrTempFave, function(f, fave){
        // if (i < 5){
          chrome.contextMenus.create({
            "title": fave.faveLabel,
            "parentId": 'annotate',
            "id": fave.id,
            "contexts": ["page", "selection", "editable"],
          });
        // }
        // i = i + increment;    // paid/trial users will increment by zero
        // console.log('Counting for faves: ' + i + ' licType: ' + licType + ' increment ' + increment);
      });

    }   //  End logic for Favorites - only run if Fave Array not empty
    console.log('Finished creating basic contextMenu...fave array: ') + console.log(arrTempFave);
    localStorage.arrLibrary = JSON.stringify(arrLibrary);   //  Store library for use elsewhere
  }   //  End check for search context - only run if called from search page

  // console.log('Right before callback - should go to next setup...arrLibrary ') + console.log(arrLibrary);
  if (callback){
    console.log('Callback from processLibrary with arrSelectedGroup: ') + console.log(arrAvailableGroup);
    callback(arrLibrary, arrAvailableGroup);     // Go on to next sub - callback.
  }

  // console.log('Store searchArray for predictive search...');
  //Don't create searchArray here anymore - happens in aSearch - remove. 3/28/18.
  // localStorage.searchArray = JSON.stringify(searchArray);   //  Store searchArray for predictive search
  // return searchArray;   //  Array for predictive search of comment library
}     //End Process Libraries

  //------ LIBRARY PROCESSING END -----

function openAccount(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {method: "openAccountPage"});
  });
}

function recordFeedback(obj, source, callback){

  console.log('Starting record feedback process ' + userID + ' using hostEditor: ' + hostEditor + ' from ' + source + ' and logging set to: ' + arrUserData.userPrefChromeLog + ' with: ') + console.log(obj);
  var loggingState = arrUserData.userPrefChromeLog;
  //  Logging if non-SpeedGrader/Gdoc AND _logging PLUS logging enabled
  if (((loggingState == 1 && source.includes("_logged") === true) || (hostEditor !== "canvasSpeedGrader" && hostEditor !== "googledocs" && hostEditor !== "canvadocs")) || (loggingState == 0 && source.includes("_logged") === false)){
    //  Don't send to server if Canvas/Google UNLESS logging is set to 'off' and we'll just send the Annotate choice, not manual entries or on-the-fly modifications

    console.log('Made it through check for logging and source...will now post...for recipID: ' + recipientID);

    if (obj.user_comment_use_custom == null){
      obj.user_comment_use_custom = 0;    //  Can't send null to query...must make 0.
    }
    // console.log('This is not a dupe - push to server...');
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){

      if (recipientID == null || arrUserData.userPrefChromeLog === 0){    //  If we have no id...make blank.
        recipientID = '';
        recipientName = '';
        recipientPicUrl = '';
      }

      // console.log('Updated course info...length: ' + Object.keys(arrCourseAssign).length) + console.log(arrCourseAssign);
      // console.log('System id is: ' + obj.anno_fb_ext_sys_id);

      if (Object.keys(arrCourseAssign).length > 0 && obj.anno_fb_ext_sys_id === 1){
        assignID = arrCourseAssign.assignmentID;
        assignName = arrCourseAssign.assignTitle;
        courseID = arrCourseAssign.courseID;
        courseName = arrCourseAssign.courseTitle;
      } else {
        //  If we have no course info...make blank.
        // As of August 2018 only generated from Canvas
        console.log('Have to add blank values...no course info from non-Canvas platforms...');
        assignID = '';
        assignName = '';
        courseID = '';
        courseName = '';
      }

      if (obj.anno_fb_ext_id == null){    //  If we have no id...make blank.
        console.log('No external ID or system ID to sync to db...use zeroes.');
        obj.anno_fb_ext_id = 0;
        obj.anno_fb_ext_sys_id = 0;
      }

      console.log('Sending feedback to server...recipientID: ' + recipientID + ' / ' + recipientName + ' for URL ' + activeURL);
      obj.currentText = $("<div>").html(obj.currentText).text();   //Remove HTML
      obj.currentURL = activeURL;   //	URL where comment was placed
      obj.currentWord	=	'';  // 	Details of Word doc
      obj.platform = navigator.platform;      // What OS are we using?
      obj.queryAction = 'createFeedback';		//	So we can create new AND update...
      obj.userID = userID;
      obj.recipientID = recipientID;
      obj.recipientName = recipientName;
      obj.recipientAvatarURL = recipientPicUrl;
      obj.fbSource = source;    //  What sent the feedback? Search? Contextmenu? DD?
      obj.assignID = assignID;
      obj.assignName = assignName;
      obj.courseID = courseID;
      obj.courseName = courseName;
      console.log('Final check of object: ') + console.log(obj);
      $.ajax({
        type: 'post',
        url: baseURL + '1saveFeedback.php',
        // url: 'https://localhost/AnnotateX/Scripts/Dev/saveFeedback.php',  //local server - macOS
        // data: JSON.stringify(obj),
        data: { obj : JSON.stringify(obj) },
        // data: obj,
        // contentType: 'application/json',
        // traditional: true,
        success: function (data) {
          console.log('Was successful in sending feedback record to server...');
          console.log(data);
          callback("success");
        },    //End async storage POST
          error: function (jqXHR, textStatus, errorThrown) {
            console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
            callback("fail");
          }
      });
  }); //  End pull URL of current tab...
  }   //  End IF for checking hostEditor to avoid double posting from Google/Canvas
  else {
    console.log('Do NOT post to server when using Google Docs or SpeedGrader - unless from _logged, which will give us the last selected Comment (from DB) AND the manually entered text from Canvas/Gdoc.');
  }
}


//Google Analytics code...

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-18355202-2']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

//End Google Analytics
