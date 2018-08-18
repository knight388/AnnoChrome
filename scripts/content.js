
var activeEl = null;
var activeTag = null;
var activeID = null;
var activeURL;

var hostEditor;     //Hold specific tool being used - for optimizations (Google, Canvas)

var speedGraderID = 'nada';      //  Holds ID of button to add comment in Canvas SpeedGrader
var sgCommentID;        //  Hold ID of actual comment (vs. button)
var recipientID;    //  Holds Canvas studentID or Google Doc author
var courseID;
var assignmentID;
var assignTitle;
var courseTitle;

var commentText = '';
var commentObj = [];      //  Holds the comment object - updated by Google/Canvas process
var useCustomFlag;      //  Tracks whether keypresses AFTER inserting a comment...
var tabCheck;         //  Safety net for catching blur in SpeedGrader when tabbing out of new comment
var civEmailAddress = {};   //  Holds current IFF recipient list: email: email@school.edu

var HTMLOBJ;         //  Holds html object
var rightOffset;    //  How much to offset right toolbar?
var TOOLBARPREF;      //  What combo of toolbars are we using?
var TOOLBARLOADED = 0;      //  Does a toolbar exist? Start at zero

  //  0: none
  //  1: right
  //  2: top
  //  3: both

// var html;   //  Set global so we can use across subs

//  -- Begin React -- //
//  From https://veerasundar.com/blog/2018/05/how-to-create-a-chrome-extension-in-react-js/
// import React from 'react';
// import ReactDOM from 'react-dom';
// // import "./content.css";
//
// class ContentReact extends React.Component {
//     render() {
//         return (
//             <div className={'react-extension'}>
//                 <p>Hello From React Extension!</p>
//             </div>
//         )
//     }
// }

//  -- End React -- //

activeURL = window.location.href;
console.log('Starting content script for URL: ' + activeURL);

//  Set up array in case purely manual commentTxt
commentObj = {
  userID: 0,
  recipientID: '',
  recipientName: '',
  recipientAvatarURL: '',
  fbSource: '',
  library_id: 0,
  group_id: 0,
  platform: '',
  comment_id: 0,
  user_comment_use_custom: 0,
  currentText: '',
  currentURL: '',
  currentWord: '',
  queryAction: ''
};


window.addEventListener ("load", checkEditor(activeURL), false);

if ((!document.mozFullScreen && !document.webkitIsFullScreen)) {
   //FullScreen is disabled
   console.log('fullscreen disabled');
} else {
  console.log('fullscreen enabled');
   //FullScreen is enabled
}

//  Has to remain outside of hostEditor check to work

$(document).on( 'blur', '.CommentGroup-textarea', function( e ) {
  console.log('blured out of comment area...1...with tabCheck: ' + tabCheck);
  if (tabCheck === 1){   //  skip send if tab is taking care of it...
    console.log('Already sent to server by keydown...skip...');
  } else {
    sendSpeedGraderComment();
  }
});

// $(document).on( 'blur', '.CommentGroup-textarea.is-selected', function( e ) {
//   console.log('blured out of comment area...2');
//   sendSpeedGraderComment();
// });

//  CommentGroup--active class seems to be more reliable than option 2 above...
// $(document).on( 'blur', '.CommentGroup--active', function( e ) {
//   console.log('blured out of comment area...3');
//   sendSpeedGraderComment();
// });

if (hostEditor === "canvasSpeedGrader"){
  console.log("SET UP CANVAS LISTENERS...");

  console.log('Add listener for clicking rubric image...');
  $(document).on( 'blur', '.criterion_comments_link', function( e ) {
    console.log('clicking rubric comments for specific row...get the criterion ID and save as SG id...');
    console.log(this);
    console.log(this.closest("tr").id);
    speedGraderID = this.closest("tr").id;
    speedGraderID = speedGraderID.replace(/criterion_/g, "");
    speedGraderID = recipientID + '_' + assignmentID + speedGraderID;
    //Have to include recipID (studentID) here because we update based on just the ID, not student and ID, when we write/update MySQL feedback
    console.log('Rubric ID / speedGraderID: ' + speedGraderID);
  });
  //
  // $('.criterion_comments').one('click', function (e){
  //   // console.log('Clicking rubric row...') + console.log(this);
  //   // console.log(rubricCommentEl.closest("tr").id);   //  This will be criterion_id
  //   speedGraderID = this.closest("tr").id;
  //   // speedGraderID = this.id;
  // });

  $(document).on( 'click', '.save_button', function( e ) {
    var rubricCommentEl = $('#criterion_comments_textarea');
    console.log(rubricCommentEl);
    console.log('clicking UPDATE COMMENTS button on rubric comment popup');
    var commentTxt = rubricCommentEl.val();
    console.log('I have clicked to post the rubric comment - please save to Annotate FEED...: ' + activeURL + ' on Element ' + activeID + ' with comment: ' + commentTxt);
    console.log("sgCommentID right before send..." + sgCommentID);
    postCanvasComment(commentTxt, speedGraderID);
  });
}     //  End top-level listeners for Canvas

if (window == window.top && hostEditor === 'canvasSpeedGrader'){
  console.log('Yes - top window...');
  getCanvasStudent();     //Scrape name and avatar URL
  getUserCourseDeets();    //  Get course and assignment IDs and names
}

function checkEditor(URL){
  // console.log('Checking URL of active content script / frame...');
  if ((URL.includes("speed_grader") === true || URL.includes("canvadocs") === true) && URL.includes("https") === true){
    hostEditor = "canvasSpeedGrader";
    // console.log('Hosteditor set to: Canvas SpeedGrader is main window ');
  } else if (URL.includes("discussion_topics") === true){
    hostEditor = "canvasDiscussions";
    console.log('Hosteditor set to: Canvas Discussions.');
  } else if (URL.includes("docs.google.com/document") === true || URL.includes("script.google.com") === true){
    hostEditor = "googledocs";
    console.log('Hosteditor set to: Google Docs');
  } else if (URL.includes("https://portal.openenglish.com/") === true){
    hostEditor = "OpenEnglish";
    console.log('OpenEnglish: ');
  } else if (URL.includes("webapps/discussionboard") === true || URL.includes("webapps%2Fblackboard") === true || URL.includes("webapps%2Fgradebook") === true || URL.includes("webapps/rubric") === true || URL.includes("rubric/courseAssessment") === true){
    hostEditor = "Bb";
    console.log('Hosteditor set to: Bb: ');
  } else if (URL.includes("brightspace") === true){
    hostEditor = "D2L";   //  For Brightspace/D2L
  } else if (URL.includes("waypointoutcomes") === true || URL.includes("civitaslearning.com/") === true){
    hostEditor = "civitas";   //  For Bridgepoint
  // } else if (URL.includes("classroom.google") === true){
  //   hostEditor = "gooClassroom";   //  For Google classroom
  //  TODO: right toolbar obscures the '+' button that is core to Classroom
  } else {
    hostEditor = 'noTB';     //  Don't use toolbars
  }
}


$(document).keydown(function(e) {
  var keyCode = e.keyCode || e.which;

  tabCheck = 0;     // Reset; tracks whether we're tabbing to leave a SG comment

  // console.log('Pressed: ' + keyCode + " in hostEditor: " + hostEditor);
  // if (e.keyCode == 83 && e.altKey) {         // ALT S
  //  S = 83, F = 70
  if (e.keyCode == 70 && e.ctrlKey && e.altKey) {         // ALT S
    focusSearch();    //  focuses on AP sidebar search or top if available
  }

  // if (hostEditor === 'civitast'){
  getCivitasID();     //  Puts data-offset-key in speedGraderID field...
  // }

  if (keyCode == 9 && hostEditor === "canvasSpeedGrader" && activeEl.className === "CommentGroup-textarea is-selected") {
    console.log('What El am I tabbing from?') + console.log(activeEl);
    tabCheck = 1;   //  Flag so we don't double-send to server
    sendSpeedGraderComment();
  }
});


if (hostEditor !== "noTB" && window === window.top){ //  If top window install TB where appropriate
      // if (hostEditor === 'canvasSpeedGrader'){
      //   console.log("Doing the iframe thing in speedgrader...");
      // }
      console.log('I am the main page - insert an iframe...for hostEditor: '  + hostEditor);

      chrome.runtime.sendMessage({msg: "checkLoginStatus"}, function(response) {
        //  Has to WAIT for response...
         console.log('Called background.js to get Login status...');
         TOOLBARPREF = response.toolbarPref;
         console.log(response.userID + ' / ' + TOOLBARPREF);
         if(response.userID > 0 && TOOLBARPREF > 0){
           // console.log('Logged in so run iFrame setup...');
           // setupIframe(response.toolbarPref);

           if (TOOLBARLOADED < 1){
             console.log('Need to run setupIframe...TB not loaded...');
             //TODO: Put back / SG optimizing experiment
             setupIframe(TOOLBARPREF);     //  Run setup if they don't exist...
           }

           var displayHeight = $( window ).height();
            console.log('Height of window: ' + displayHeight);
            var vertLoc;

            if (displayHeight > 1200){
              console.log('Long window...');
              vertLoc = '500px'
            } else {
              vertLoc = '33%';
            }

            var aPos = 0;    // adjust location of right edge for h scrolling pages

            var div = '<div id="aSidebarButton" class="no-print" style="position: absolute; display: none; top: ' + vertLoc + '; z-index: 2147483647; right: ' + aPos + ';"><img src="https://11trees.com/annotate/images/aSidebarTabIcon1.png" alt="Annotate Sidebar Button"></div>';

            $('html').append(div);
            var a = chrome.extension.getURL("css/sb.css");
            $('<link rel="stylesheet" type="text/css" href="' + a + '" >').appendTo("head");

            console.log('XXXX Added A button...');

            var aButton = document.getElementById("aSidebarButton");

            if (localStorage.showTB > 0){
              //  Already indicated we want to show the toolbar
              console.log('Show the toolbar with current choice of top/right etc');
              showTB();
            } else {
              console.log('Toolbar hidden but active; show button');
               aButton.style.display = "";
               $('#aSidebarButton').show();
              //  show the button
            }

             // button.person_name = "Roberto";
             aButton.addEventListener("click", function() {
               console.log('Clicking Annotate button...');
               aButton.style.display = "none";
               localStorage.showTB = 1;   //  Set to 1 to indicate show TB
               showTB();
             }, false);
         } else {
           console.log('NOT logged OR toolbars off - do not run iFrame setup...');
         }
       // }
      });
    }

function getCivitasID(){
  try{
    var civitasChild1 = activeEl.children[0];
    var lineEl = civitasChild1.lastElementChild;
    var lineElcontent = civitasChild1.lastElementChild.innerHTML;
    // console.log(lineEl);
    // console.log(lineElcontent);
    var civSpanEl = lineEl.children[0].children[0];
    // console.log(civSpanEl);
    // get attribute to create new spans
    speedGraderID = civSpanEl.getAttribute("data-offset-key");    //TODO: make this ID universal
    console.log('Code for this span is: ' + speedGraderID);
    var civSpanHTML = lineEl.children[0].children[0].innerHTML;
    // console.log('Span content that I can replace: ') + console.log(civSpanHTML);
  } catch {
    console.log('NOT in Civitas OR in Civitas but not focused on an email...');
  }
}   //  End Civitas data-offset-key listener


function showTB(){
  console.log('Showing TB with setting: ' + TOOLBARPREF);

  //  Add logic for SG full Screen
  showSGfullscreenTB();

  if(TOOLBARPREF == 1){
    var iFrameTB = document.getElementById("annotatePROtoolbar");
    iFrameTB.style.display = "";
    aButtonSetup('show');
  }
  if(TOOLBARPREF == 2){
    var iFrameSB = document.getElementById("annotatePROsidebar");
    iFrameSB.style.display = "";
    aButtonSetup('show');
  }
  if(TOOLBARPREF == 3){
    console.log('Show both toolbars...');
    var iFrameTB = document.getElementById("annotatePROtoolbar");
    iFrameTB.style.display = "";
    var iFrameSB = document.getElementById("annotatePROsidebar");
    iFrameSB.style.display = "";
    aButtonSetup('show');
  }
}

function focusSearch(){
  console.log('Focus on search...');
  chrome.runtime.sendMessage({ msg: "focusIframe"});
}

function focusToolbar(){
  console.log('Finally - focus on toolbar search element...');
  // $('#annotatePROtoolbar').focus();
  // $('#searchLibraryTB').focus();
  // $('#annotatePROtoolbar').focus();
  // //use JQuery to find the control in the IFRAME and set focus
  // $('#annotatePROtoolbar').contents().find("#searchLibraryTB").focus();
  // var ifLen = $('#annotatePROtoolbar').length;
  // console.log('iFrame length: ' + ifLen);
  var iframeID = document.getElementById("annotatePROtoolbar");
  //focus the IFRAME element
  console.log('In focus sub and element focused is iframe: ') + console.log(iframeID);
  $(iframeID).focus();
  //use JQuery to find the control in the IFRAME and set focus
  // var searchID = document.getElementById("searchLibraryTB");
  // $(searchID).focus();

  // $('#searchLibraryTB').focus();
  // $('#searchLibraryTB').value = "search mf";

  $(iframeID).contents().find("#searchLibraryTB").focus();
}

//TODO: not used anywhere...
function findAncestor (el, cls) {
    console.log('Looking for ancestor for class: ' + cls + ' and element ') + console.log(el);
    while ((el = el.parentElement) && !el.classList.contains(cls));
    console.log('Found ancestor: ') + console.log(el);
    return el;
}

function showSGfullscreenTB(){
  var tempURL = window.location.href;
  console.log('Trying to add toolbar (if ON) to SG iframe...URL: ' + tempURL);

  var tempHTMLOBJ = $(document.getElementsByClassName('Pages-annotatable')[0]);
  console.log('Trying to set htmlObj in SG iframe: ') + console.log(tempHTMLOBJ);

  if (TOOLBARPREF > 0){
    console.log('Toolbar pref is ON...');
  }

  var displayHeight = $( window ).height();
  var displayWidth = $( window ).width();

  var height = '0px';
  var width = '200px';
  // setTB(height, width);     //  moves body page to allow top toolbar


  // tempHTMLOBJ.css(
  //   'margin-top: ' + height + 'px',     //make sure we're -adding- to any existing values
  //   'height: ' + displayHeight - 1 * height + 'px'
  // );
  $(tempHTMLOBJ).css({
    'margin-top': height + 'px',
    'height': displayHeight - 1 * height + 'px',
    'width': displayWidth - 1 * width + 'px'
  });

  var annoSGSidebarFrameID = 'annotatePROsidebarSG';
  if (document.getElementById(annoSGSidebarFrameID)) {
    console.log('id:' + annoSGSidebarFrameID + 'Already exists - do nothing...!');
    // throw 'id:' + annoSGSidebarFrameID + 'taken please dont use this id!';
  } else {    //  sidebar doesn't yet exist - create it...

      console.log('Trying to add iframe toolbar...');

      var topMargin = "50px";    //  just sidebar - no top margin

      rightOffset = '14px';

      tempHTMLOBJ.append(
        '<iframe id="' + annoSGSidebarFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aSidebar.html" frameborder="0" allowfullscreen="1" scrolling="yes" allowtransparency="false" display="none" style="position: absolute; width: ' + width + '; overflow-x: hidden !important; overflow-y: auto !important; overflow:hidden; border:none; z-index: 2147483647 !important; top: ' + topMargin + '; height: 100%; right: ' + rightOffset +';"></iframe>'
      );
    }   //  End creating toolbar - doesn't yet exist
}

document.addEventListener('focusin',function(event){
  updateCurrentSelection("focusin");

  if (activeURL != '' && activeURL !== 'about:blank' && activeURL !== undefined){
    checkEditor(activeURL);   //  Update hostEditor for this frame

    console.log('FOCUS IN on ' + activeURL + ' / ' + hostEditor + ' and activeEl is: ' + activeEl) + console.log(activeEl);

    if (hostEditor === "civitas"){
      console.log("Using Civitas...");

      // if (hostEditor === 'civitast'){
        getCivitasID();     //  Puts data-offset-key in speedGraderID field...
      // }   //  End check for Civitas. TODO: move this down to get the rest of the functionality
      civEmailAddress = {};     // wipe

      try{
        if ($('.to-field')){   //  Student email field exists
          var emailObj = $('.to-field');
          var emailAddress;     //  Holds text email

          emailObj = emailObj[0].children;
          console.log('Email Obj1: ') + console.log(emailObj);
          console.log('Emailobj length: ' + emailObj.length);
          if (emailObj.length > 1){
            console.log('multiple students...');
            $.each(emailObj,function (i, email) {
              console.log('Email: ' + email.title);
              civEmailAddress.email = email.title;
            });
          } else if (emailObj.length === 1){
            console.log('one student...');
            emailAddress = $('.to-field').html();
            var pattern = "&lt;(.*)&gt;<\/span>";
            var match = recipientID.match(pattern);    //  -1 if no studentID matches
            emailAddress = match[1];
            console.log('Student email2: ' + emailAddress);
            civEmailAddress.email = emailAddress;
          }

          console.log('Finished processing email address with array: ') + console.log(civEmailAddress);

          // chrome.runtime.sendMessage({msg: "saveRecipient", recipientID: recipientID});

          courseTitleObj = $('#course-info');
          console.log(courseTitleObj);
          courseTitleObj = courseTitleObj[0];
          console.log(courseTitleObj);
          courseTitleObj = courseTitleObj.children[0];
          console.log(courseTitleObj);
          courseTitleObj = courseTitleObj.children[0];
          console.log(courseTitleObj);
          // courseTitle = courseTitleObj.contents().filter(function(){
              // return this.nodeType === 3;
          // });
          courseTitle = courseTitleObj.textContent;
          console.log('Title: ' + courseTitle);

          pattern = "sections\/(.*)\/";
          match = activeURL.match(pattern);    //  -1 if no studentID matches
          console.log('Assign match: ') + console.log(match);
          courseID = match[1];
          //TODO: write student id, course? and system ID to DB...

          var arrTemp = {};

          arrTemp.assignmentID = 'Civitas IFF';
          arrTemp.courseID = courseID;
          arrTemp.assignTitle = 'Civitas IFF';
          arrTemp.courseTitle = courseTitle;

          chrome.runtime.sendMessage({msg: "saveAssignCourse", arrData: arrTemp});
        }
      } catch{
        console.log('Cannot get student and course info...');
      }

      //  Shift email messaging modal over so we can see AP toolbar
      var flexPopout = $('.flexible-popout');
      if(flexPopout){
        console.log('Flexpopout is open...');
        console.log(flexPopout);
        flexPopout.css({
        'right': '300px'
        });
      }
    }

    //  Google Docs logging an existing bubble comment
    if (hostEditor === "googledocs"){
      if ($('.docos-input-buttons-post').length){   //Is the 'post' button there?
        var commentTxt = $('.docos-input-textarea').val();
        console.log('GoogleDocs create comment / text of comment: ' + commentTxt);
        commentObj.currentText = commentTxt;
        commentObj.user_comment_use_custom = useCustomFlag;
        commentObj.anno_fb_ext_id = '';
        commentObj.anno_fb_ext_sys_id = 2;      //  Indicates Google Docs

        // console.log('Class of Active Element: ' + activeEl.attr('class'));
        var clickClass = activeEl.className;

        console.log('Class of Active Element / Object: ' + clickClass) + console.log(commentObj);

        if (clickClass.indexOf("docos-input-buttons-post") >= 0 && commentTxt !== 'Reply...'){
          console.log('I have clicked to post the comment (and it is not Reply...)- please save to Annotate FEED...');
          saveFeedbackPort(commentObj, "chrome_logged");
          // chrome.runtime.sendMessage({ msg: "saveFeedback", obj: commentObj, source: 'chrome_logged'});
          // commentObj = {      //  Wipe so next manual comment doesn't pick up predecessor...
          //   anno_fb_ext_id: '',
          //   anno_fb_ext_sys_id: 0,      //  Indicates Google Docs
          //   library_id: 0,
          //   group_id: 0,
          //   comment_id: 0,
          //   user_comment_use_custom: 0
          // }
        }
      }
      }     //  END Google Docs

  if (hostEditor === "canvasSpeedGrader" && activeURL.includes("canvadocs") === false){      //  Non-document markup...the comments on the side, rubrics

    console.log('Running non-document Canvas process...');

    // if (window == window.top) {     //  Only if top window
      $('#comment_submit_button').one('click', function(e) {
      // $('#comment_submit_button').click(function() {
        console.log('Class: ' + $(this).attr("class"));
        var commentTxt = $('#speedgrader_comment_textarea').val();
        console.log('I have clicked to post the comment - please save to Annotate FEED...: ' + activeURL + ' on Element ' + activeID);
        commentObj.currentText = commentTxt;
        commentObj.user_comment_use_custom = useCustomFlag;
        commentObj.anno_fb_ext_id = '';
        commentObj.anno_fb_ext_sys_id = 1;      //  Indicates Canvas
      });

      if (activeID === 'comment_submitted_message' && commentObj.currentText.length > 0){
        console.log('--- NOW send once....') + console.log(commentObj);
        saveFeedbackPort(commentObj, "chrome_logged");
        // chrome.runtime.sendMessage({ msg: "saveFeedback", obj: commentObj, source: 'chrome_logged'});
        //   commentObj = {      //  Wipe so next manual comment doesn't pick up predecessor...
        //     anno_fb_ext_id: '',
        //     anno_fb_ext_sys_id: 0,      //  Indicates Google Docs, Canvas
        //     library_id: 0,
        //     group_id: 0,
        //     comment_id: 0,
        //     user_comment_use_custom: 0
        //   }
      }
  } else if (activeURL.includes("canvadocs") === true){

    if (activeEl.className === "CommentGroup-textarea is-selected" || activeID === "speedgrader_comment_textarea"){
      // Margin comments AND overall comments - different logic
      console.log('In canvas - figuring out speedgraderID...');
      // if (activeEl.className == "CommentGroup-textarea"){
      console.log('We can identify new comment bubble in Canvas...' + activeEl.className);
      sgCommentID = $('.CommentGroup--active').attr('id');
      console.log('Comment ID: ' + sgCommentID);
      var coreID = sgCommentID.slice(13);
      console.log('CoreID is: ' + coreID);
      speedGraderID = coreID;
     } else {
       console.log('We are not focused on a SpeedGrader comment...');
    }

  }  //  END Canvas logic

  } else { //  End check for blank activeURL in Focusin handler
      console.log('Focusin URL was blank - no action...');
    }
});   //  End focusin listener

document.addEventListener("mouseup",function(event){
  updateCurrentSelection("mouseup");
  checkEditor(activeURL);   //  Update hostEditor for this frame

  //TODO: decide whether I need this - covered by focusin?
  // if (hostEditor === 'civitast'){
    // getCivitasID();     //  Puts data-offset-key in speedGraderID field...
  // }
  if (document.querySelector('.Comment-create--visible') !== null) {
    // check for SpeedGrader element
    speedGraderID = document.querySelector('.Comment-create--visible').id;
    console.log('SG ID before slice: ' + speedGraderID);
    var coreID = speedGraderID.slice(0, -22);
    speedGraderID = coreID;
    console.log('On MU Speedgrader and class exists...with URL: ' + activeURL + ' and seeing a comment bubble with sgID: ' + speedGraderID);
  }
  },
 true
);

document.addEventListener("mousedown",function(event){
  updateCurrentSelection("mousedown");
  checkEditor(activeURL);   //  Update hostEditor for this frame
  // if (hostEditor === 'civitast'){
  getCivitasID();     //  Puts data-offset-key in speedGraderID field...
  // }
  },
 true
);

document.addEventListener("keypress",function(event){
  // console.log('Keypress...' + event.keyCode);
  activeURL = window.location.href;
  activeEl = document.activeElement;
  activeTag = activeEl.tagName.toLowerCase();
  activeID = activeEl.id;

  //TODO: remove - just civitas testing...
  // var emailEditorObj = $('#email-message-input');
  // // console.log('Pressing key and seeing1: ') + console.log(emailEditorObj);
  //
  // // var newObj = emailEditorObj[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0].childNodes;
  // emailEditorObj = emailEditorObj[0].childNodes[0].childNodes[0].childNodes[0].childNodes[0];
  //
  //
  // // console.log('Pressing key and seeing2: ') + console.log(emailEditorObj);
  // //  This is one object per div
  //
  // var emailHTML = getTextWithSpaces(emailEditorObj);
  // // console.log('Text from sub processing: ' + emailHTML);

  if (activeURL != '' && activeURL !== 'about:blank' && activeURL !== undefined){

    // console.log('KEYPRESS ' + activeURL + ' / ' + hostEditor + ' and activeEl is: ' + activeEl) + console.log(activeEl);

    chrome.runtime.sendMessage({msg: "activeElementID", action: "set", id: activeID, origin: "keypress", url: activeURL, hostEditor: hostEditor});  //  Tell background what is active
    // console.log('keypress and URL of frame is: ' + activeURL);
    // checkEditor(activeURL);   //  Update hostEditor for this frame
    useCustomFlag = 1;
    // console.log("Keypress and set custom flag to: " + useCustomFlag);
  } else {
    console.log('Keypress but skipping any updating of elements...');
  }
  },
 true
);

function collectTextNodes(element, texts) {
    for (var child= element.firstChild; child!==null; child= child.nextSibling) {
        if (child.nodeType===3)
            texts.push(child);
        else if (child.nodeType===1)
            collectTextNodes(child, texts);
    }
}
function getTextWithSpaces(element) {
    var texts= [];
    collectTextNodes(element, texts);
    for (var i= texts.length; i-->0;)
        texts[i]= texts[i].data;
    return texts.join(' ');
}

function updateCurrentSelection(source){
  activeEl = document.activeElement;
  activeTag = activeEl.tagName.toLowerCase();
  activeID = activeEl.id;
  activeURL = window.location.href;
  // var elementType = activeEl.prop('nodeName');

  console.log(source + ' and URL of frame is: ' + activeURL + " and ID/tag of element is: " + activeID + " / " + activeTag + ' and Element Object: ') + console.log(activeEl);

  if (source === 'focusin'){
    chrome.runtime.sendMessage({msg: "activeElementID", action: "set", id: activeID, origin: source, url: activeURL, hostEditor: hostEditor});  //  Tell background what is active
  } else {
    try{
        chrome.runtime.sendMessage({msg: "activeElementID", action: "set", id: activeID, origin: source, url: activeURL, hostEditor: hostEditor});  //  Tell background what is active
      } catch (err){
        console.log('Page must be refreshed...' + err)
        alert("Annotate PRO (AP) needs you to refresh this page in order to be available and work properly.\n\nThis situation is usually occurs just installing or updating AP.")
    }
  }   //  End ELSE for non-focusin events
}


function listenFullScreen(){

  console.log('Adding listeners for full screen in Canvas...');

  var classname = document.getElementsByClassName("AnnotationControlButton");

  for (var i = 0; i < classname.length; i++) {
    console.log('Remove listener... ' + i);
      classname[i].removeEventListener('click', myFunction, false);
  }

  var myFunction = function() {
      var attribute = this.getAttribute("title");
      console.log('Clicked! Attributes: ') + console.log(attribute);
      // if (attribute === 'Enter Full Screen'){
      if (attribute === 'Zoom Out'){
        var tempURL = window.location.href;
        console.log('Trying to add toolbar (if ON) to SG iframe...URL: ' + tempURL);

        var tempHTMLOBJ = $(document.getElementsByClassName('Pages-annotatable')[0]);
        console.log('Trying to set htmlObj in SG iframe: ') + console.log(tempHTMLOBJ);

        height = '0px';
        width = '200px';
        // setTB(height, width);     //  moves body page to allow top toolbar


        tempHTMLOBJ.css(
          'margin-top: ' + height + 'px',     //make sure we're -adding- to any existing values
          'height: ' + displayHeight - 1 * height + 'px'
        );
        $(tempHTMLOBJ).css({
          'margin-top': height + 'px',
          'height': displayHeight - 1 * height + 'px',
          'width': displayWidth - 1 * width + 'px'
        });

        var annoSGSidebarFrameID = 'annotatePROsidebarSG';
        if (document.getElementById(annoSGSidebarFrameID)) {
          console.log('id:' + annoSGSidebarFrameID + 'taken please dont use this id!');
          throw 'id:' + annoSGSidebarFrameID + 'taken please dont use this id!';
        } else {    //  sidebar doesn't yet exist - create it...

            console.log('Trying to add iframe toolbar...');

            var topMargin = "75px";    //  just sidebar - no top margin

            rightOffset = '0px';

            HTMLOBJ.append(
              '<iframe id="' + annoSGSidebarFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aSidebar.html" frameborder="0" allowfullscreen="1" scrolling="yes" allowtransparency="false" display="none" style="position: absolute; width: ' + width + '; overflow-x: hidden !important; overflow-y: auto !important; display: none; overflow:hidden; border:none; z-index: 2147483647 !important; top: ' + topMargin + '; height: 100%; right: ' + rightOffset +';"></iframe>'
            );
          }   //  End creating toolbar - doesn't yet exist

        // document.getElementById("speedgrader_iframe").style.zIndex = "10000";
        // var zSG = document.getElementById("speedgrader_iframe");  //.style.zIndex();
        // console.log('Seeing SG iframe1: ') + console.log(zSG);
        //
        // // document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]
        // var iframeObj = document.getElementsByTagName('html');
        // // var iframeObj = document.getElementById("speedgrader_iframe");
        // console.log('Seeing SG iframe2: ') + console.log(iframeObj);
        // var c = document.body.children;
        // console.log('Entire thing: ') + console.log(c);
        // HTMLOBJ = iframeObj;
      } else if (attribute === 'Zoom In'){
      // } else if (attribute === 'Exit Full Screen'){
        console.log('back to normal...');
      }
  };

  for (var i = 0; i < classname.length; i++) {
      console.log('ADD listener... ' + i);
      classname[i].addEventListener('click', myFunction, false);
  }
}

function getUserCourseDeets(evt){
  console.log('Canvas-specific code...get ass and course IDs and names for activeURL: ' + activeURL);
  //  On first load: https://canvas.instructure.com/courses/1237288/gradebook/speed_grader?assignment_id=7377977

  var jsInitChecktimer = setInterval (checkForJS_Finish1, 111);

  function checkForJS_Finish1 () {
    if (activeURL.includes("student_id")){

        clearInterval (jsInitChecktimer);

        var pattern = "ment_id=(.*)#";
        var match = activeURL.match(pattern);    //  -1 if no studentID matches
        console.log('Assign match: ') + console.log(match);
        assignmentID = match[1];

        pattern = "courses\/(.*?)\/";
        match = activeURL.match(pattern);    //  -1 if no studentID matches
        console.log('Course match: ') + console.log(match);
        courseID = match[1];

        if (activeURL.includes("student_id%22:%22")){
          pattern = 'student_id%22:%22(.*?)%22';
        }  else if (activeURL.includes("student_id%22%3A%22")){
          pattern = 'student_id%22%3A%22(.*?)%22';
        }
        try {
          match = activeURL.match(pattern);    //  -1 if no studentID matches
          console.log('Recip match: ') + console.log(match);
          recipientID = match[1];
        } //  alternate presentation of student in URL
        catch {
          console.log('Was not able to match recipient...v1');
        }


        console.log('Got assignment and course and recipID: ' + assignmentID + ' / ' + courseID + ' / ' + recipientID);

        console.log('Assignment object: ') + console.log($('#assignment_url')[0]);

        assignTitle = $('#assignment_url')[0].innerText;
        assignTitle = assignTitle.trim();
        courseTitle = $('#context_title')[0].innerText;
        courseTitle = courseTitle.trim();

        console.log('Got assignment and course: ' + assignTitle + ' / ' + courseTitle);

        var arrTemp = {};

        arrTemp.assignmentID = assignmentID;
        arrTemp.courseID = courseID;
        arrTemp.assignTitle = assignTitle;
        arrTemp.courseTitle = courseTitle;

        chrome.runtime.sendMessage({msg: "saveAssignCourse", arrData: arrTemp});
    }   //   End check to see if element exists
  }   //  End timer check
}   //  End getUserCourseDeets

function getCanvasStudent(evt){
  //  Only works if we're on the top page...
  console.log('Scraping Canvas student name & avatar...button is: ');

  // if (window != window.top) {
  //   console.log('In an IFRAME - do not refresh or show iFrame (?): ' + window.location.href);
  // } else if (hostEditor === 'canvasSpeedGrader'){
  //     console.log('Made it to searching for getCanvasStudent...');
      var jsInitChecktimer = setInterval (checkForJS_Finish2, 111);
      // console.log('Try to get Canavs student name...FROM A function call');
      var parent;
      var nameSpan;
      var recipName;
        function checkForJS_Finish2 () {
          if ($('#students_selectmenu-button').length && recipName !== ''){   //Is the student drop down there with a name?
          // }
            clearInterval (jsInitChecktimer);

            parent = document.getElementById('students_selectmenu-button').children[0];
            nameSpan = parent.children[1];
            recipName = nameSpan.innerText;

            // DO YOUR STUFF HERE.
            // console.log('Waiting for page to load with interval timer...');
            var recipNameEl = $('#students_selectmenu-button');
            // console.log('Canvas student name element: ') + console.log(recipNameEl);
            // console.log('First try at parent Element holding name...') + console.log(parent);
            //
            // console.log('Canvas student name span1: ' + nameSpan) + console.log(nameSpan);
            console.log('Canvas student name: ' + recipName) + console.log(recipName);

            chrome.runtime.sendMessage({msg: "recipName", action: "set", name: recipName});  //  Tell background user's name
            if($('#avatar').length){
            var avatarURL = $('#avatar_image');
            // console.log('IMG is: ' + avatarURL) + console.log(avatarURL);
            console.log('URL is: ' + avatarURL[0]) + console.log(avatarURL[0].src);
            avatarURL = avatarURL[0].src;
            chrome.runtime.sendMessage({msg: "recipAvatarURL", url: avatarURL});  //  Tell background user's avatar pic URL
          }   //  END check for avatar image URL in Canvas
        }   //  End check for NAME and avatar in canvasSpeedGrader
      }   //  End timer check for load
      // } catch {
      //   console.log('Could not get name/id...');
      // }
  // }
}




chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // console.log('Message listener / using Editor: ' + hostEditor); // + console.log(request);

    if (request.method === "refreshIframeTB"){
      if (window != window.top) {
        console.log('In an IFRAME - do not refresh or show iFrame (?): ' + window.location.href);
        // if (hostEditor === 'canvasSpeedGrader'){
        //   console.log('first call to getCanvasStudent...');
        //   getCanvasStudent();     //Scrape name and avatar URL
        // }
      } else if (hostEditor !== "noTB"){
        console.log('Using hostEditor ' + hostEditor + ' and I am the top page - refresh the iframe...XXXXXXXXXXXXXX');

        //  TODO: move to function called by speedgrader logic
        if (hostEditor === 'canvasSpeedGrader'){
          console.log('Second call to getCanvasStudent...');
          getCanvasStudent();     //Scrape name and avatar URL
        }

        // console.log('Now refresh iFrames with name: ' + recipName);
        $('#annotatePROsidebar').attr('src', $('#annotatePROsidebar').attr('src'));
        $('#annotatePROtoolbar').attr('src', $('#annotatePROtoolbar').attr('src'));
      }
      return true;   //has to be asynch or will fail
    } else if (request.method === "closeSidebar2"){
      console.log('Please show button and close iframe...');
      localStorage.showTB = 0;

      var iFrameFullScreen = document.getElementById("annotatePROsidebarSG");
      if (iFrameFullScreen){
        iFrameFullScreen.parentNode.removeChild( iFrameFullScreen );
        //  We don't put back the green 'A' button.
      }

      var iFrameSB = document.getElementById("annotatePROsidebar");
      if (iFrameSB){
        console.log('Have sidebar - close it!');
        iFrameSB.style.display = "none";
        aButtonSetup('close');
      }

      var iFrameTB = document.getElementById("annotatePROtoolbar");
      console.log(iFrameTB);
      if (iFrameTB){
        console.log('Have top toolbar - close it!');
        iFrameTB.style.display = "none";
        aButtonSetup('close');
      }
    } else if (request.method === "sgFullScreenTB"){
        console.log('In content script - adjust regular TB and button...') + console.log(request);
        if (request.action === "hideregular"){
          console.log('Opening FS toolbar...so hide regular one and button...');
          var aButton = document.getElementById("aSidebarButton");
          if (aButton){
            aButtonSetup('close');  //  Close the regular toolbar
            aButton.style.display = "none";     //  Hide the button
          }
          // var SGtb = document.getElementById('annoSGSidebarFrameID');
          // if (SGtb){
          //   console.log('hide the white x for SG FS...');
          //   var whiteCloseBtn = document.getElementById('whiteCloseXspan');
          //   whiteCloseBtn.style.display = "none";
          // }
        } else if (request.action === "showregular"){
          console.log('Closing FS toolbar...so show regular one and button...default to showing TBs');
          var aButton = document.getElementById("aSidebarButton");
          if (aButton){
            aButton.style.display = "";     //  Show the button
          }
        }
    } else if (request.method === 'insertComment'){   // InSERT a comment

      useCustomFlag = 0;    //  Set to 0...if no keystroke then this will be passed to db

      console.log('Trying to insert with activeEl/hostEditor: ') + console.log(activeEl + ' / ' + hostEditor);

      //  Special case for Google Docs BODY - copying to clipboard
      try {   //  Special case for Google Docs BODY - copying to clipboard
        console.log(document.getElementById("docs-instant-button-bubble"));
        var googCommentBubble = document.getElementById("docs-instant-button-bubble");
        var googCommentBubbleVisible;
        var googCommentBubbleClass =  googCommentBubble.className;
        console.log('Class: ' + googCommentBubbleClass);
        if (googCommentBubbleClass.includes("docs-instant-button-visible")){
          googCommentBubbleVisible = true;
        } else {
          googCommentBubbleVisible = false;
        }
        console.log('Button visible: ' + googCommentBubbleVisible);
      } catch {
        console.log('Google Docs Comment Bubble button not visible / could not get...');
        var googCommentBubbleVisible = false;
      }

      // if (hostEditor === "googledocs"){
      //   try{
      //     if (activeEl.classList.contains("docs-texteventtarget-iframe") && googCommentBubbleVisible === false){
      //       console.log('Google Doc body - copy to clipboard...');
      //         // if (document.querySelector('.docs-texteventtarget-iframe') !== null) {
      //         // if ($('.docs-texteventtarget-iframe').length) {      // What if we don't see the button or a bubble? The Doc body...
      //         commentObj = request.comment;
      //         console.log('Google Docs Body insert?...create hidden div, populate, and copy from it. Comment is: ' + commentObj.currentText)
      //
      //         chrome.runtime.sendMessage({ msg: "copy2clipboard", comment: commentObj.currentText});
      //     }
      //   }
      //   catch {
      //     console.log('On googledocs but not inserting text into body - can see comment bubble...');
      //   }
      // } else {

      chrome.runtime.sendMessage({msg: "activeElementID", action: "check"}, function(storedURL) {
          //  Has to WAIT for response...
          // console.log('Calling background.js for ' + activeURL + ' to get active URL currently being worked - to avoid updating incorrect elements)');
          // console.log(' vs. stored URL: ' + storedURL);

          if (storedURL === activeID){
          // if (storedURL === activeURL){
            var actualElementID = storedURL;    //  For checking to see if we should update...

          // var activeURL = request.activeURL;
          // activeURL = activeURL.substring(0,31);    // 33 for Google Docs
          console.log('URLs match - okay to proceed: ' + ' hostEditor: ' + hostEditor + ' stored / actual URL: ' + storedURL + ' / ' + activeURL);

          commentObj = [];
          commentObj = request.comment;
          sValue = commentObj.currentText;
          // console.log('Comment is: ' + sValue) + console.log(commentObj);

        // ---------- CANVAS ------------------------>
        if (activeURL.includes("canvadocs") === true){

          //  Canvas - insert comment bubble after highlighting

          console.log('In Canvas and the element we will click: ' + speedGraderID + ' or commentID: ' + sgCommentID);
          // var tempClassName = document.getElementById(speedGraderID).className;
          // console.log('Activetag: ' + activeTag + ' / Class: ' + tempClassName);

          // if (document.getElementById(speedGraderID) && activeTag !== 'textarea'){
          if (document.getElementById(speedGraderID + '-comment-create-button')){

          // if (document.getElementById(speedGraderID) && document.getElementById(speedGraderID).className === "Comment-create Comment-create--visible"){
            //  Checking textarea makes context menu work...just inserts plain text.
            //  Need to check for ID AND visible class...or just insert plain
            //  BUT: by the time we check class, we've clicked away...and so it goes to not visible
            console.log('Using search or fave to add...');
            if (document.getElementById(speedGraderID + '-comment-create-button').className !== "CommentGroup CommentGroup--active"){
              console.log('Need to click button (visible or not) to make comment bubble appear...');
              document.getElementById(speedGraderID + '-comment-create-button').click();
            }
            //  Now should have text area...regardless of clicking or not...

            var sField2 = $('#CommentGroup-' + speedGraderID);

            sField = sField2[0].children[0].children[1].children[0];

            var nStart = sField.selectionStart;
            var nEnd = sField.selectionEnd;

            console.log("Have created comment box...sub with starting point: " + nStart + ' and end ' + nEnd + ' with value ' + sValue);
            var link;
            sValue = convertURL(sValue);
            console.log('After converting any URLs: ') + console.log(sValue);
            sValue = $("<div>").html(sValue).text();      //  Flip to pure text / eliminate HTML
            sField.value = sField.value.substring(0, nStart) + sValue + sField.value.substring(nEnd, sField.value.length);
            sField.selectionStart = nStart + sValue.length;
            sField.selectionEnd = nStart + sValue.length;
            sField.focus();
            console.log('Printed value1...');
          } else {
            console.log('I DO NOT see the SG button...');
            console.log("some other sort of comment - just insert...");
            plainInsert(sValue);
          }
        // } else if (hostEditor === "Bb"){
        //   console.log('Handling Bb scenario...trying!');

      } else if (hostEditor === "civitas"){
        console.log('Do special stuff for Civitas...on element: ') + console.log(activeEl);
        console.log('Incoming comment is: ' + sValue);
        //insert processing here to covert to spans
        //TODO: Trim starting and ending <p> tags from Comment...
        // sValue = sValue.replace(/<\/p>/ig, '#newline#');    //  Replace para end with space
            //TODO: newline difficult because you need a new data-offset-key
        sValue = sValue.replace(/<a href.*?>/ig, '#linkA#');    //  Replace start of a link
        sValue = sValue.replace(/<\/a>/ig, '#linkB#');    //  Replace end of a link
        // sValue = sValue.replace(/<strong>/ig, '*');     // Replace <strong> tags
        // sValue = sValue.replace(/<\/strong>/ig, '*');     // Replace <\strong> tags
        // sValue = sValue.replace(/<em>/ig, '_');     // Replace <em> tags
        // sValue = sValue.replace(/<\/em>/ig, '_');     // Replace </em> tags

        //  Text - IFF
          //  <span data-text="true">Marketing and communications profes</span>

        // LINK - IFF:
          //  <a href="http://www.google.com" target="_blank"><span data-offset-key="7aofn-1-0"><span data-text="true">www.google.com</span></span></a>
        //  LINK - AP Editor:
          //  <a href="www.google.com" target="_blank">www.google.com</a>

        //  BOLD:
          //  <span data-offset-key="50ssi-0-1" style="font-weight: bold;"><span data-text="true">bolded</span></span>

        sValue = $("<div>").html(sValue).text();

        sValue = sValue.replace(/#newline#/ig, '<br data-text="true">');    //  Replace para end with space
        sValue = sValue.replace(/#linkA#/ig, '<a href="http://www.google.com" target="_blank"><span data-offset-key="' + speedGraderID + '"><span data-text="true">');    //  Replace start of a link
        sValue = sValue.replace(/#linkB#/ig, '</span></span></a>');    //  Replace end of a link
        //  Code finds the last line in the div and replaces its HTML with AP comment
        sValue = '<span data-text="true">' + sValue + '</span>';    //  Wrap for insertion...


        var civitasChild1 = activeEl.children[0];
        var lineEl = civitasChild1.lastElementChild;
        var lineElcontent = civitasChild1.lastElementChild.innerHTML;
        console.log(lineEl);
        console.log(lineElcontent);
        console.log(lineEl.children[0].children[0]);
        var civSpanHTML = lineEl.children[0].children[0].innerHTML;
        console.log('Span that I can replace: ') + console.log(civSpanHTML);
        //  Finally...insert...
        lineEl.children[0].children[0].innerHTML = sValue;
        $('.public-DraftEditor-content').focus();     //  Try to focus on line where we've typed...

        //React experiments
        // chrome.runtime.sendMessage({ msg: "reactEvent", action: "dosomething"});
        // editorState: EditorState.createEmpty()
        //
        // var currentContent = getCurrentContent();
        // console.log('Content: ' + currentContent)

      } else if (hostEditor === "googledocs"){

        if (activeEl.classList.contains("docs-texteventtarget-iframe") && googCommentBubbleVisible === false){
          console.log('Google Doc body - copy to clipboard...');
            // if (document.querySelector('.docs-texteventtarget-iframe') !== null) {
            // if ($('.docs-texteventtarget-iframe').length) {      // What if we don't see the button or a bubble? The Doc body...
            commentObj = request.comment;
            console.log('Google Docs Body insert?...create hidden div, populate, and copy from it. Comment is: ' + commentObj.currentText)

            chrome.runtime.sendMessage({ msg: "copy2clipboard", comment: commentObj.currentText});
        } else {
          console.log('Handling Google Docs...turning ON keydown listener if bubble visible...');

          //Convert <strong> and <em> to bold and italic markup...before flipping OFF html
          sValue = sValue.replace(/<\/p>/ig, ' ');    //  Replace para end with space
          sValue = sValue.replace(/<strong>/ig, '*');     // Replace <strong> tags
          sValue = sValue.replace(/<\/strong>/ig, '*');     // Replace <\strong> tags
          sValue = sValue.replace(/<em>/ig, '_');     // Replace <em> tags
          sValue = sValue.replace(/<\/em>/ig, '_');     // Replace </em> tags

          sValue = convertURL(sValue);
          console.log('After converting any URLs: ') + console.log(sValue);

          //convert to plain text for Google Docs
          sValue = $("<div>").html(sValue).text();

          if(document.getElementById("docs-instant-button-bubble")){    //  This doesn't tell us much...
            console.log('We have found the Google new comment button...may be visible or not');
            var buttonClass = document.getElementById("docs-instant-button-bubble").className;
            if (buttonClass.includes("docs-instant-button-visible") === true){
              document.getElementById("docs-instant-button-bubble").click();
              // document.getElementById("docos-comment-bubble").click();
              var el = document.activeElement;

              console.log('On a Google Doc and trying to insert ' + sValue + ' into el ') +console.log(el);
               var val = el.value;
               var endIndex;
               var range;
               var doc = el.ownerDocument;
               if (typeof el.selectionStart === 'number' &&
                   typeof el.selectionEnd === 'number') {
                   endIndex = el.selectionEnd;
                   el.value = val.slice(0, endIndex) + sValue + val.slice(endIndex);
                   el.selectionStart = el.selectionEnd = endIndex + sValue.length;
                   postGoogComment();
               } else if (doc.selection !== 'undefined' && doc.selection.createRange) {
                   el.focus();
                   range = doc.selection.createRange();
                   range.collapse(false);
                   range.text = sValue;
                   range.select();
                   postGoogComment();
              }
            } else if ($('.docos-input-textarea').length){    //  Visible comment bubble
              console.log('Bubble already exists...insert simple way - Element from background is: ' + storedURL + ' / ' + actualElementID);

              var el = document.activeElement;
              console.log('Found bubble with element: ') + console.log(el);
              if (el.id !== 'annotatePROtoolbar' && el.id !== 'annotatePROsidebar'){
                // var val = $('.docos-input-textarea').val();
                var val = el.value;
                var endIndex;
                var range;
                var doc = el.ownerDocument;
                if (typeof el.selectionStart === 'number' &&
                typeof el.selectionEnd === 'number') {
                  endIndex = el.selectionEnd;
                  el.value = val.slice(0, endIndex) + sValue + val.slice(endIndex);
                  el.selectionStart = el.selectionEnd = endIndex + sValue.length;
                  postGoogComment();
                } else if (doc.selection !== 'undefined' && doc.selection.createRange) {
                  el.focus();
                  range = doc.selection.createRange();
                  range.collapse(false);
                  range.text = sValue;
                  range.select();
                  postGoogComment();
                }
              }  else {   //  End IF for NOT clicking Annotate toolbar
                console.log('Clicking favorite button in toolbar...');
                var currentVal = $('.docos-input-textarea').val();
                $('.docos-input-textarea').val(currentVal + sValue);    //  Append to current value
                $('.docos-input-textarea').focus();    //  Append to current
              }
            }   //  End visible comment bubble logic
          }   //  End Google Docs bubble check (visible / invisible bubble)
        } //  End GoogleDocs BUBBLE logic (vs. copy to body)
        }  //  end GoogleDoc logic
          else if($('.bp-highlight-comment-btn').length){   //  Box Viewer / Blackboard inline commenting
          console.log('We are in Box viewer and can see the NEW COMMENT button...');
          $('.bp-highlight-comment-btn').click();
          console.log('Click comment button...');
          var el = document.activeElement;
          console.log('On a Box Viewer and trying to insert ' + sValue + ' into el ') +console.log(el);
           var val = el.value;
           var endIndex;
           var range;
           var doc = el.ownerDocument;
           if (typeof el.selectionStart === 'number' &&
               typeof el.selectionEnd === 'number') {
               endIndex = el.selectionEnd;
               el.value = val.slice(0, endIndex) + sValue + val.slice(endIndex);
               el.selectionStart = el.selectionEnd = endIndex + sValue.length;
               // postGoogComment();
           } else if (doc.selection !== 'undefined' && doc.selection.createRange) {
               el.focus();
               range = doc.selection.createRange();
               range.collapse(false);
               range.text = sValue;
               range.select();
          }
      } else {      // Handle non-special cases - not Bb/Canvas/GoogleDocs
          console.log('NO SPECIAL EDITOR - Trying to send to plainInsert - no special handling: '); //  + console.log(sValue);
          plainInsert(sValue);
        }
      }   //End of IF to check whether URLs match...
      else {
        console.log('The stored ID does not match the active one...skip...stored vs. actual: ' + storedURL + ' / ' + activeID);
      }
    });   //  End check to background for active element
    // }   //  End ELSE for non-Google Doc body
    sendResponse({
      response: "inserted"
    });
    return true;   //has to be asynch or will fail
  }     //  End insertComment message handler
});   //  End listener for messages from background

function sendSpeedGraderComment(){
  console.log('After BLURRING after focusin to a SG comment... ' + sgCommentID); // + console.log($('#' + speedGraderID).html());
  // console.log('Comment text currently: ' + $(this).val());

  var parent = document.getElementById(sgCommentID).children[0];
  // console.log('First try at parent...but it is getting child of top level...') + console.log(parent);

  var commentContent = parent.children[1];
  // console.log('One layer down...') + console.log(commentContent);

  var commentTxtArea = commentContent.children[0]
  // console.log('Two layers down...') + console.log(commentTxtArea);

  var commentTxt = commentTxtArea.value;
  console.log("sgCommentID right before send..." + sgCommentID);
  postCanvasComment(commentTxt, speedGraderID);
}

function convertURL(commentHTML){

  console.log('Original comment...') + console.log(commentHTML);

  var myRegexp = /<a(.*?)<\/a>/igm;
  // match = myRegexp.exec(commentHTML);
  var match = commentHTML.match(myRegexp);
  // var res = str.match(/<a(.*?)<\/a>/gi);
  console.log('Comment broken into <a> tags...') + console.log(match);

  var apURL;    //  Will hold URL (no quotes)
  while (match !== null) {
    console.log('Running this N: ') + console.log(match[0]);
    myRegexp = /href="(.*?)"/igm;
    apURL = myRegexp.exec(match[0]);
    myRegexp = /"(.*?)"/igm;
    apURL = myRegexp.exec(apURL);
    console.log('URL1 is: ') + console.log(apURL[1]);
    //remove quote marks
    // myRegexp = /"/igm;
    // apURL = apURL.replace(myRegexp, '');
    // console.log('URL2 is: ' + apURL);
    commentHTML = commentHTML.replace(match[0], apURL[1]);
    console.log('---- UPDATED COMMENT ----');
    console.log(commentHTML);
    myRegexp = /<a(.*?)<\/a>/igm;
    match = myRegexp.exec(commentHTML);
    console.log('Final match array: ') + console.log(match);
  }

  console.log('URLs converted to plain text: ') + console.log(commentHTML);
  return commentHTML;
}   //  End convertURL sub

function postCanvasComment(commentTxt, speedGraderID){
  console.log('sending to server...from canvas...if NOT blank');
  if (commentTxt !== ''){
    //  Only send to server if NOT blank...some Canvas functions will double-send because of blur losing focus (and sending) a comment that may not have any content in it.
    commentObj.currentText = commentTxt;
    commentObj.user_comment_use_custom = useCustomFlag;
    commentObj.anno_fb_ext_id = speedGraderID;
    commentObj.anno_fb_ext_sys_id = 1;      //  Indicates Speedgrader
    //  Other values flow from previous choice from Annotate menus...

    saveFeedbackPort(commentObj, "chrome_logged");
  }   //  End check for blank comment
}


function saveFeedbackPort(commentObj, source){
  console.log('Trying to message background with long-lived port...from source: ' + source);
  var port = chrome.runtime.connect({name: "saveFeedback"});
  port.postMessage({obj: commentObj, source: source});
  port.onMessage.addListener(function(msg) {
    // console.log('Messaging from background is...') + console.log(msg);
    if (msg.answer === "success"){
      console.log('Background was successful saving to db...');
      // port.postMessage({answer: "Madame"});
    } else if (msg.answer === "fail"){
      console.log('Background failed at saving to db...');
      alert("Apologies! Annotate PRO (AP) was not able to save your text to the cloud. Try refreshing this page or checking your Internet connection. Visit https://www.11trees.com/live/support/support-annotate-pro/ for help or to contact us.")
    }
  });
    // chrome.runtime.sendMessage({ msg: "saveFeedback", obj: commentObj, source: 'canvas_logged'});
    commentObj = {      //  Wipe so next manual comment doesn't pick up predecessor...
      anno_fb_ext_id: '',
      anno_fb_ext_sys_id: 0,      //  Indicates Google Docs
      user_avatar_url: '',
      library_id: 0,
      group_id: 0,
      comment_id: 0,
      user_comment_use_custom: 0
    }
}

function postGoogComment(){   //  Complete submission of Google comment
  console.log('Complete clicking POST to submit Google comment...');
  // document.querySelector('.goog-inline-block jfk-button jfk-button-action docos-input-post docos-input-buttons-post jfk-button-clear-outline').click();
  var postBtn = document.getElementsByClassName('docos-input-buttons')[0].children[0];
  var element = document.getElementById("el"); //grab the element
  postBtn.onclick = function() { //asign a function
    console.log('Clicked to submit Google Docs comment...');
  }
}

// Stick button to right side of screen...must account for pages wider than viewable area
// var lastPos = 0;

$(window).resize(function(){
  console.log('Resizing window...');

  if ((!document.mozFullScreen && !document.webkitIsFullScreen)) {
     //FullScreen is disabled
     console.log('FFfullscreen disabled');
     console.log('back to normal...kill iframe...');
     var frame = document.getElementById( "annotatePROsidebarSG" );
     if (frame){
       frame.parentNode.removeChild( frame );
       attribute = '';
       chrome.runtime.sendMessage({msg: "showSGfullscreenTB1", action: "close"});  //  Tell background what is active
     }
  } else {
    console.log('FFfullscreen enabled');
    if (activeURL.includes("canvadocs") === true){      //  SpeedGrader iFrame
     showSGfullscreenTB();
     chrome.runtime.sendMessage({msg: "showSGfullscreenTB1", action: "open"});  //  Will communicate to other content scripts to HIDE the regular button/TB
       }   //  check for specific element with specific attribute
  }


  if (TOOLBARPREF > 0 && TOOLBARLOADED > 0){
    console.log('Resize window and toolbar...');
    if (localStorage.showTB > 0){
      setHTML('open');      //  Show toolbar(s)
    } else {
      setHTML('close');     //  Show button
    }
  }

  // height = '80px';
  // width = '200px';
  // setTB(height, width);     //  moves body page to allow top toolbar

});

$(window).scroll(function() {
  var aPos = 0;    // adjust location of right edge for h scrolling pages

  var currHPos = $(document).scrollLeft();
  aPos = -1 * currHPos;
  var sbPos = -1 * currHPos - 200;

  var currVPos = $(document).scrollTop();
  var displayHeight = $( document ).height();
  var viewHeight = $( window ).innerHeight();
  // console.log('Height of window (location/total/viewable): ' + currVPos + ' / ' + displayHeight + ' / ' + viewHeight);
  var vertLoc;

  vertLoc = .33 * viewHeight + currVPos;
  // if (displayHeight > 1200){
  //   console.log('Long window...');
  //   vertLoc = '500px'
  // } else {
  //   vertLoc = '33%';
  // }

  // console.log('Top: ' + vertLoc);
  // console.log('qPos / sidebar right pos: ' + qPos + ' / ' + sbPos);
// css({"propertyname":"value","propertyname":"value",...});
  $( '#aSidebarButton' ).css( {"right": aPos, "top": vertLoc});
  $( '#annotatePROsidebar' ).css( "right", sbPos );

  // lastPos = currPos;

});

function aButtonSetup(state){
  // if (window != window.top) {
    console.log("Setup button with state: " + state);
    var aButton = document.getElementById("aSidebarButton");
    if (aButton){
      if (state === 'close'){
        console.log('Show the button...for URL: ' + activeURL);
        localStorage.showTB = 0;      //  Save the choice to local storage for new windows
        aButton.style.display = "";   //  Show the button
        setHTML('close');     //  reset width of main page
      } else {    //  Show the sidebar
        console.log("Hide button and show sidebar...");
        localStorage.showTB = 1;      //  Save the choice to local storage for new windows
        setHTML('open');     //  call sub to set width of page in readiness for iframe
        aButton.style.display = "none";     //  Hide the button
        if (TOOLBARLOADED < 1){
          setupIframe(TOOLBARPREF);     //  Run setup if they don't exist...
        }
      }
    }   //  End check for button existence
  // }   //  End check for window top
}

function setHTML(action){
  console.log('Setting size of iframe with action: ' + action);

    //  Logic for main page toolbar add
    if (document.documentElement) {
      HTMLOBJ = $(document.documentElement); //just drop $ wrapper if no jQuery
    } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
      HTMLOBJ = $(document.getElementsByTagName('html')[0]);
    } else if ($('html').length > -1) {//drop this branch if no jQuery
      HTMLOBJ = $('html');
    } else {
      alert('no html tag retrieved...!');
      throw 'no html tag retrieved son.';
    }

  // if (hostEditor !== 'canvasSpeedGrader'){
  //   rightOffset = '-200px'
  //   if (document.documentElement) {
  //     HTMLOBJ = $(document.documentElement); //just drop $ wrapper if no jQuery
  //   } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
  //     HTMLOBJ = $(document.getElementsByTagName('html')[0]);
  //   } else if ($('html').length > -1) {//drop this branch if no jQuery
  //     HTMLOBJ = $('html');
  //   } else {
  //     alert('no html tag retrieved...!');
  //     throw 'no html tag retrieved son.';
  //   }
  // } else {
  //   console.log('In Speedgrader...setting right offset to zero');
  //   rightOffset = '0px'
  // }
  // if (html.css('position') === 'static') { //or //or getComputedStyle(html).position
  //   html.css('position', 'relative');//or use .style or setAttribute
  // }

  var height;
  var width;

  if (action === 'close'){
    console.log('Closing tbs and resizing page...');
    height = 0;
    width = 0;
    setTB(height, width);     //  moves body page to allow top toolbar
  } else {  // 'open'

  if (HTMLOBJ.css('position') === 'static') { //or //or getComputedStyle(html).position
    HTMLOBJ.css('position', 'relative');//or use .style or setAttribute
  }

  if (TOOLBARPREF == 1){
    height = 80;
    width = 0;
    setTB(height, width);     //  moves body page to allow top toolbar
  }

  if (TOOLBARPREF == 2){
    height = 0;
    width = 200;
    setTB(height, width);     //  moves body page to allow top toolbar
  }

  if (TOOLBARPREF == 3){
    height = 80;
    width = 200;
    setTB(height, width);     //  moves body page to allow top toolbar
  }
}   //  end OPEN logic
}

function setTB(height, width){

  //top (or right, left, or bottom) offset

  console.log('Set underlying DOM margins/location. Height: ' + height + ' / Width: ' + width + ' / HTML element: ') + console.log(HTMLOBJ);

  var displayHeight = $( window ).height();
  var displayWidth = $( window ).width();

  console.log('Current ht and wd of visible html: ' + displayHeight + ' / ' + displayWidth);

  HTMLOBJ.css(
    'margin-top: ' + height + 'px',     //make sure we're -adding- to any existing values
    'height: ' + displayHeight - 1 * height + 'px'
  );
  $(HTMLOBJ).css({
    'margin-top': height + 'px',
    'height': displayHeight - 1 * height + 'px',
    'width': displayWidth - 1 * width + 'px'
  });
}

function setupIframe(toolbarSetting){
  console.log("Adding iFrame to: " + window.location.href + " with toolbar setting: " + toolbarSetting);

  if (document.documentElement) {
    HTMLOBJ = $(document.documentElement); //just drop $ wrapper if no jQuery
  } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
    HTMLOBJ = $(document.getElementsByTagName('html')[0]);
  } else if ($('html').length > -1) {//drop this branch if no jQuery
    HTMLOBJ = $('html');
  } else {
    alert('no html tag retrieved...!');
    throw 'no html tag retrieved son.';
  }

  var height;
  var width;

  if (toolbarSetting == 1) {    //  Use top toolbar...
    console.log('Add top toolbar...');
    //height of top bar, or width in your case
    height = '80px';
    width = 0;
    setTB(height, width);     //  moves body page to allow top toolbar

    var annoTopFrameID = 'annotatePROtoolbar';
    if (document.getElementById(annoTopFrameID)) {
      console.log('id:' + annoTopFrameID + 'taken please dont use this id!');
      throw 'id:' + annoTopFrameID + 'taken please dont use this id!';
    }
    //  production: clpoilnjjdbfjinifhmcfddhjgneajle
    //  beta: njikodeokfnapmngpidpdmlhbgpkgfab

      HTMLOBJ.append(
        '<iframe id="' + annoTopFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aToolbar.html" scrolling="yes" frameborder="0" allowtransparency="false" style="position: fixed; width: 100%; border: none; z-index: 2147483647; top: 0px; display: none; height: '+ height + '; overflow-x: hidden; right: 0px;left: 0px;">'+
        '</iframe>'
      );
    // TOOLBARLOADED = 1;      //  Indicates loaded...
  }   //  End insert top toolbar
   else if(toolbarSetting == 2 ){    //  Show sidebar only
    console.log('Add sidebar...');

   // if (HTMLOBJ.css('position') === 'static') { //or //or getComputedStyle(html).position
   //   HTMLOBJ.css('position', 'relative');//or use .style or setAttribute
   // }

    height = '0px';
    width = '200px';
    setTB(height, width);     //  moves body page to allow top toolbar

    var annoSidebarFrameID = 'annotatePROsidebar';
    if (document.getElementById(annoSidebarFrameID)) {
      console.log('id:' + annoSidebarFrameID + 'taken please dont use this id!');
      throw 'id:' + annoSidebarFrameID + 'taken please dont use this id!';
    } else {    //  sidebar doesn't yet exist - create it...

        var topMargin = "0px";    //  just sidebar - no top margin

        rightOffset = '-200px';
        console.log('Creating right toolbar with offset: ' + rightOffset);

        //' + rightOffset + '

        HTMLOBJ.append(
          '<iframe id="' + annoSidebarFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aSidebar.html" frameborder="0" allowfullscreen="1" scrolling="yes" allowtransparency="false" display="none" style="position: absolute; width: ' + width + '; overflow-x: hidden !important; overflow-y: auto !important; display: none; overflow:hidden; border:none; z-index: 2147483647 !important; top: ' + topMargin + '; height: 100%; right: ' + rightOffset +';"></iframe>'
        );
      }   //  End creating toolbar - doesn't yet exist
    } else if(toolbarSetting == 3 ){    //  Show both top and annoSidebarFrameID
        console.log('show top and side toolbars...')
        //
        // if (HTMLOBJ.css('position') === 'static') { //or //or getComputedStyle(html).position
        //   HTMLOBJ.css('position', 'relative');//or use .style or setAttribute
        // }

        height = '80px';
        width = '200px';
        setTB(height, width);     //  moves body page to allow top toolbar

        var annoTopFrameID = 'annotatePROtoolbar';
        if (document.getElementById(annoTopFrameID)) {
          console.log('id:' + annoTopFrameID + 'taken please dont use this id!');
          throw 'id:' + annoTopFrameID + 'taken please dont use this id!';
        }
        //  production: clpoilnjjdbfjinifhmcfddhjgneajle
        //  beta: njikodeokfnapmngpidpdmlhbgpkgfab

          HTMLOBJ.append(
            '<iframe id="' + annoTopFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aToolbar.html" scrolling="yes" frameborder="0" allowtransparency="false" style="position: fixed; width: 100%; overflow-x: hidden; border: none; z-index: 100000; top: 0px; display: none; height: '+ height + ';right: 0px;left: 0px;">'+
            '</iframe>'
          );

        var annoSidebarFrameID = 'annotatePROsidebar';
        if (document.getElementById(annoSidebarFrameID)) {
          console.log('id:' + annoSidebarFrameID + 'taken please dont use this id!');
          throw 'id:' + annoSidebarFrameID + 'taken please dont use this id!';
        }

        var topMargin = "0px";   // using top toolbar so move it down 80px

        HTMLOBJ.append(
          '<iframe id="' + annoSidebarFrameID + '" src="chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/aSidebar.html" scrolling="yes" frameborder="0" allowtransparency="false" style="position: absolute; width: 200px; overflow-x: hidden; overflow-y: auto !important; border:none; z-index: 10000; display: none; top: ' + topMargin + '; height: 100%; right: -200px;">'+
          '</iframe>'
        );
      }   //  End IF for toolbarSetting = 3 (both side and top)

      TOOLBARLOADED = 1;      //  Indicates loaded...
}   // End setupIframe


function format(oldText) {
	var newText = oldText.replace(/(\r\n|\n|\r)/gm, ("\n" + "\u2022"));
	return ("\u2022" + newText);
}

function plainInsert(sValue) {
  //  Logic for non-specified editor - so plain vanilla HTML. Could still require HTML input.

  // chrome.runtime.sendMessage({msg: "activeElementID", action: "check"}, function(storedURL) {
  //   //  Has to WAIT for response...
  //   console.log('Calling background.js to get active element ID currently being worked - to avoid updating incorrect elements)');
  //   console.log(storedURL);
  //   if (storedURL = activeURL){
  //   var actualElementID = storedURL;    //  For checking to see if we should update...

    console.log('In plainInsert sub...old school insertion...');

    // activeTag = document.activeElement.tagName.toLowerCase();      //Checking for currently selected area

    //Need to take into account 2 scenarios:
    // 1) Google Docs, where the last Element will be iFrame but we've opened a simple textarea in the form of a bubble that won't show as active (clicked) area
    // 2) HTML editors that have been changed to plain text...which will not have empty objects for cilcked/keypunched area.
    console.log('Plain Insert for ' + activeURL + ' / ' + hostEditor + ' and activeEl tag/id is: ' + activeTag + " / id: " + document.activeElement.id) + console.log(activeEl);

    var editableEl = activeEl.classList.contains('editable');
    console.log('Editable? ' + editableEl);

    var editablEl2 = activeEl.contentEditable;
    console.log('Editable2? ' + editablEl2);

    console.log('Current element: ') + console.log(activeEl);

    // console.log("currentEltag before logic: " + currentEltag + " / id: " + document.activeElement.id);
    console.log("activeTag/editable: " + activeTag + ' / ' + editableEl + ' / ' + editablEl2);
    console.log("Type of editable: " + typeof editableEl + ' / ' + typeof editablEl2);

    if (activeTag === undefined || activeTag === null){
      console.log('currentEltag in logic: ' + activeTag);
      if (activeTag === 'iframe'){
        activeTag = 'iframe';
        console.log('Making activeTag equal iframe' + activeID + " / " + activeTag);
      }
    }

    var sField = activeEl;

    // console.log('This is where it breaks - activeTag not set: ' + activeTag + ' with ID ') + console.log(activeID);

    if ((activeTag === 'input' || activeTag === 'textarea')){ // && activeURL === actualElementID){

      sValue = convertURL(sValue);
      console.log('After converting any URLs: ') + console.log(sValue);

      sValue = $("<div>").html(sValue).text();    //  flip to plain text & remove HTML

      console.log('Dealing with input/textarea - yes! sField (no HTML) is: ' + sField + " / " + activeID + " / " + activeTag);

      var nStart = sField.selectionStart;
      var nEnd = sField.selectionEnd;

       if (nStart || nEnd == '0'){
          console.log("Inside insert sub with starting point: " + nStart + ' and end ' + nEnd + ' with value ' + sValue);
          sField.value = sField.value.substring(0, nStart) + sValue + sField.value.substring(nEnd, sField.value.length);
          sField.selectionStart = nStart + sValue.length;
          sField.selectionEnd = nStart + sValue.length;
          console.log('Now focus on the active element: ' + activeID);
          $('#' + activeID).blur();
          $('#' + activeID).focus();
        }
        else {
          sField.value = sValue;
          console.log('Now focus on the active element: ' + activeID);
          $('#' + activeID).blur();
          $('#' + activeID).focus();
        }
    }   //End if input or textarea
    else if (activeTag === "div" && (editableEl === true || editablEl2 === "true")){
      console.log('We know you are a div...AND EDITABLE');

      var sel, range;
          if (window.getSelection) {
              // IE9 and non-IE
              console.log('Have selection...');
              sel = window.getSelection();
              if (sel.getRangeAt && sel.rangeCount) {
                  range = sel.getRangeAt(0);
                  range.deleteContents();
                  var el = document.createElement("div");
                  el.innerHTML = sValue;
                  // console.log('Printed value...to div');
                  // sendResponse({status: "printed to div"});
                  var frag = document.createDocumentFragment(), node, lastNode;
                  while ( (node = el.firstChild) ) {
                      lastNode = frag.appendChild(node);
                  }
                  var firstNode = frag.firstChild;
                  range.insertNode(frag);

                  // Preserve the selection
                  if (lastNode) {
                      range = range.cloneRange();
                      range.setStartAfter(lastNode);
                      // if (selectPastedContent) {
                          range.setStartBefore(firstNode);
                      // } else {
                      //     range.collapse(true);
                      // }
                      sel.removeAllRanges();
                      sel.addRange(range);
                  }
              }
              else {
                var div = document.getElementById(document.activeElement.id);
                div.innerHTML = div.innerHTML + sValue;
                // console.log('Hack1 for DIV...printed text');
              }
          }
        else if (document.selection && document.selection.createRange) {
          console.log('NO selection...');
            document.selection.createRange().text = sValue;
            // console.log('Alternate insert for DIV...printed text');
          }
        else {
          console.log('Setting innerHTML...');
          var div = document.getElementById(document.activeElement.id);
          div.innerHTML = div.innerHTML + sValue;
          // console.log('Hack2 for DIV...printed text');
        }
    }

    // Why would I want to trap for body or BUTTONs?
    // else if (activeTag === "body" || activeTag === "button"){
    else if (activeTag === "body"){     //  tinyMCE editor (and similar?) via iFrame...will not 'see' hostEditor
      // console.log('Body...: ' + window.location.href + " / " + activeID + " / " + activeTag + " / " + hostEditor);
      var sField = document.activeElement;

      // var gotFocus = $(activeID + ":focus");
      // console.log('Has focus: ' + gotFocus) + console.log(gotFocus);
      //
      // var isFocus = $("#" + activeID).is(":focus")
      // console.log('ID is focus: ' + isFocus) + console.log(isFocus);
      //
      // isFocus = $("#" + activeTag).is(":focus")
      // console.log('Tag is focus: ' + isFocus) + console.log(isFocus);


      if (activeTag === "body" && activeID != null){
        console.log('Body content: ');
        try{
          var bodyContent = $('#' + activeID).html();
          // console.log('What is this for? ' + $('#' + activeID).html());
          if (bodyContent === '<p><br data-mce-bogus="1"></p>'){
            $('#' + activeID).html(sValue); //  For TinyMCE and similar - overwrite
          } else {
            $('#' + activeID).append(sValue); //  For TinyMCE and similar - append
          }
          try {
            var nStart = sField.selectionStart;
            var nEnd = sField.selectionEnd;
          }
            catch (e) {
             // statements to handle any exceptions
             console.log("Can't grab start and end...")
              sField.value = sValue;
              //  console.log('Printed value...to body/button?');
              // sendResponse({status: "printed to body/button in middle of text"});     //Why would I want to do this?
          }

          if (nStart || nEnd == '0'){
            console.log("Inside insert sub with starting point: " + nStart + ' and end ' + nEnd + ' with value ' + sValue);

            sField.value = sField.value.substring(0, nStart) + sValue + sField.value.substring(nEnd, sField.value.length);
            sField.selectionStart = nStart + sValue.length;
            sField.selectionEnd = nStart + sValue.length;
            // console.log('Inserted in between text in button/body...');
           }
          else {
             sField.value = sValue;
             console.log('Jammed text into space not knowing if in middle or not -  tinymce/editor body...' + activeID);
             $('#' + activeID).blur();
             $('#' + activeID).focus();
            //  console.log('Printed value...');
            // sendResponse({status: "printed to body/button at zero position"});
           }
         } catch {    //  End maiN TRY
           console.log('Could not add to this element...jQuery not recognized...?')
         }
      } //  End IF for body tag and null activeID
    }   //End Else for non-iFrame. May need to add more conditions here or make a subroutine
}   //  End plainInsert sub for general text insertion
