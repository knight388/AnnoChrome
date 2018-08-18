
//URLs for scripts
  // var baseURL = "https://localhost/AnnotateX/Scripts/Dev/";    //local server - macOS
  var baseURL = "https://www.11trees.com/annotate/scripts/prod/";									//production

//Global variables
  var FROMLANG;      //Set defaults for translation
  var TOLANG;
  var DUALRESP;     //Should we reply in 2 languages?
  var LASTMENU = '';     //tracks last DD menu clicked - so we can close it if clicked again
  var LASTGROUP = '';    //tracks last group DD clicked...so we can close
  var FBUID;        //  Hold Firebase uid for SSO handoff to web app

  var arrUserData = [];
  var userID;
  var licType;
  var clientID;
  var email;
  var providerData;
  var displayName;
  var searchChar;     //  search/match one or two characters

  var recipientID;      //  Holds unique ID for recipient of feedback
  var totalRows = 0;    //  How many feedback comments for this user?

  var arrSelectedLib = [];    //  Array to hold default/selected libraries (client or user defined)
  var arrLibrary = [];

$(document).ready(function () {   // document.ready - The initialize function is run each time the page is loaded.
    "use strict";

    console.log('Starting aSearch with toolbar setting: ' + arrUserData.userPrefChromeToolbar);

    //Check validated email status
    var config = {
      apiKey: "AIzaSyBUgUUAIF_WdLpXTM91csO8xnmCergJ9sI",
      authDomain: "trees-3aac6.firebaseapp.com",
      databaseURL: "https://trees-3aac6.firebaseio.com",
      storageBucket: "trees-3aac6.appspot.com",
      // messagingSenderId: "819483525640"
    };

    firebase.initializeApp(config);

    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {       // User is signed in.

        console.log('Search / User FB token is: ') + console.log(user.qa);

        FBUID = user.uid;        //  Store in global for handoff to web app

        var emailVerified = user.emailVerified;
        console.log('Verified - now get set up search page...verified state: ' + emailVerified);

        arrUserData = JSON.parse(localStorage.userDetails);
        userID = arrUserData.userID;
        licType = arrUserData.licType;
        clientID = arrUserData.clientID;

        setupPopupMenuBtns();    //  Listeners for popup menu buttons...

        if (localStorage.arrLibrary && localStorage.lastSync > 0){
          arrLibrary = JSON.parse(localStorage.arrLibrary);
          setupSearchPage2(arrLibrary);
        } else {
          setupSearchPage1();   //  No local data - pull active libraries...
        }
        //MSG background and get response...
        if (!emailVerified){
          // if (localStorage.emailVerified == "false"){
          console.log('Pop warning...');
          $('#flexModalHeader').html('Your email is not yet verified...');
           $('#flexModalMsg').html("<div class=\"panel panel-default\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We need to verify your identity. Check for an email from \"noreply@11trees.com\" asking you to click a link to confirm your account. The email should arrive within 5 minutes but may end up in your spam folder - so please check.</p><p></p><p><b>Some users have reported emails from us being blocked completely</b>. If you don't find the verification email in your inbox or spam folder, please contact your IT department.</p><p></p><p>Once you\'ve clicked the verification link in the email we sent you, reopen Annotate PRO's Chrome Extension and you should be good to go!</div></div></div>");
           $('#flexModal').modal('show');
        }
      }
    });

    // $(document).tooltip({
    //     items: ".tooltip:not(:focus)"
    // });

  setupSearchPage();      //  Basic listeners & setup


});  //End document.ready

function setupSearchPage(){      //  Basic listeners & setup for green buttons

  //  Empty search if clicked
  $('#searchLibrary').focus(function() {
     this.value = '';
  });

  $('#searchLibrarySB').click(function(e) {
    e.preventDefault();
    console.log('Clicking into search...')
  });

  $('#searchLibrarySB').focus(function(e) {
    console.log('Clicking on search in sidebar...');
    this.value = '';
  });
  $('#searchLibraryTB').focus(function() {
     this.value = '';
  });

  $(document).on('click', '.dropdown-menu', function (e) {
    // "click":function(e){
      e.stopPropagation();
  });

  $(document).on('click', '.dropdown-submenu', function (clickSubMenu) {
    console.log('gClick - Current state - LASTMENU / LASTGROUP: ' + LASTMENU + ' / ' + LASTGROUP);

    console.log('Clicking submenu group...element is: ') + console.log(this.id);
    if (this.id === "upsellMsg"){
      var address = 'annotateLibrary.html';
      var context = 'account';
      openNewWindow(address, context);
    }

    if (LASTGROUP === this.id){
     console.log('Close the group...');
     // $('.dropdown-submenu').hide();
     $(this).find(".dropdown-menu").hide();
     LASTGROUP = '';
    }  else {      //  Show menu
      if (LASTGROUP !== '' ){     //hide open Group
        console.log('Hide previous Group Comments...');
        $('#'+LASTGROUP).find(".dropdown-menu").hide();
      }
      LASTGROUP = this.id;
      console.log('New Group clicked: ' + LASTGROUP);
      $(this).find(".dropdown-menu").show();
      // $(this).find(".dropdown-submenu").show();
    }

  });

  $(document).on('click', '.scrollCommentsBtn', function(){      //  New dropdown in sidebar - scrolling
    console.log('lClick - Current state - LASTMENU / LASTGROUP: ' + LASTMENU + ' / ' + LASTGROUP);

    console.log('Clicked Library; ' + this.id);

    if (LASTMENU === this.id){
     console.log('Close the Library...');
     $('.firstLevelDD').hide();
     // $(this).find(".firstLevelDD").hide();    // hide clicked Library
     if (LASTGROUP !== '' ){      //hide open Group
       console.log('Hide previous Group Comments...');
       $('#'+LASTGROUP).find(".dropdown-menu").hide();
       LASTGROUP = '';
     }
     LASTMENU = '';
    }  else {      //  Show menu
      var libID = this.id.split("_").pop();
      LASTMENU = this.id;
      console.log('Clicked Library: ' + libID);
      $('.firstLevelDD').hide();
      $('#libDD_' + libID).show();
      $('.dropdown-submenu').hide();
      $('.' + this.id).show();
   }
  });

   $(document).on('click', '.commentDD', function(clickComment){      //  New dropdown in sidebar - scrolling
     console.log('Clicked a dD...' + this.id);
     saveFeedback(this.id, 'chrome_DD_Sidebar');
     $('.dropdown-submenu').hide();
     $('.dropdown-menu').hide();
     LASTMENU = '';
     LASTGROUP = '';
   });

  // var url = "";    // Don't know what this is for...

  //Show search and favorites regarless of license type
  $('#searchDiv').attr('class','show');
  $('#buttonRowDiv').attr('class','show');
  $('#faveDiv').attr('class','show');

  $('.collapse').on("shown.bs.collapse", function (e) {
    // var clicked = '';
    // clicked = $(".panel-collapse.collapse.in").attr("id");
    // console.log("collapse " + clicked);
    console.log("clicked " + this.id);
    if (this.id === 'search'){
      console.log('Focus on search box...1');
      $('#searchLibrary').focus();
    // } else if (this.id === 'freeform'){
    //   $('#freeForm').focus();
    } else if (this.id === 'translate'){
      $('#fromLang').focus();
    }
  });

  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    // console.log('In aSearch.js and receiving message...' + request.method);
    if (request.method === "focusToolbar"){
      console.log('Receiving message from background to focus toolbar in aSearch.js...');
      if ($('#searchLibrarySB').length){
        console.log('focs on sidebar...');
        $('#searchLibrarySB').blur();
        $('#searchLibrarySB').focus();
        // $('#scrollCommentsBtn').focus();     //  Focus on DD for keyboard scrolling
        //  Multiple problems with this...abandoned for now
      } else {
        console.log('focs on top toolbar...');
        $('#searchLibraryTB').blur();
        $('#searchLibraryTB').focus();
      }
    } else if (request.method === "openAccountPage"){
      var address = 'annotateLibrary.html';
      var context = 'account';
      openNewWindow(address, context);
    } else if (request.method === "showCommentSB"){
      console.log('Message received to pop modal...');
      var copyDiv = document.createElement('div');
      copyDiv.contentEditable = true;
      document.body.appendChild(copyDiv);
      copyDiv.innerHTML = request.comment;
      copyDiv.style = "background-color:white";
      console.log('Pasted HTML / text: ' + request.comment);
      copyDiv.unselectable = "off";
      copyDiv.focus();
      document.execCommand('SelectAll');
      document.execCommand("Copy", false, null);
      document.body.removeChild(copyDiv);
      // $('#selectedCommentDiv').html(request.comment);
      // //Select all the text!
      // // $('#selectedCommentDiv').select();
      // // var element = document.body; // Example, select the "whole" document
      // var element = $('#selectedCommentDiv');
      // // Change selected area
      // var r = document.createRange();
      // r.selectNode(element);
      // var s = window.getSelection();
      // s.removeAllRanges();
      // s.addRange(r);
      // // Copy - requires clipboardWrite permission + crbug.com/395376 must be fixed
      // document.execCommand('copy');
    }
  });
}   //  End basic searchpage setup (listeners etc)

function setupSearchPage1 (){
  console.log('try to set up page - need libs selected...');
  try {
    arrSelectedLib = JSON.parse(localStorage.arrSelectedLib);
  }
  catch (err){    //  If no array, make a blank one so popup will load...
    console.log('Do not have any libraries in array - send to create...' + err);
    var arrSelectedLib = [];
  }
  console.log('Now setup menus and progress - maybe with empty array for selectedLib');
  $('[data-toggle="tooltip"]').tooltip();   //  Initialize Bootstrap tooltips
  console.log('setupSearchPage1 / updating Search popup with ') + console.log(arrSelectedLib);
  if (arrSelectedLib.length > 0){   //  Only pull data if there is a selection...
    chrome.runtime.sendMessage({ msg: "pullProcessLibrary", lib: arrSelectedLib, context: 'createSearch'}, function(response) {
      //  Has to WAIT for response...
      console.log('Calling background.js to pull and process...');
      console.log(response.arrLibrary);
      setupSearchPage2(response.arrLibrary);   //  This is pristine library
    });
  } else {
    buildMultiselect();   //  Just build Multi - no choices to pull data yet
  }
}

function setupSearchPage2(tempArrLibrary){

  console.log('Setting up search with these user deets: ') + console.log(arrUserData);

  // var currentTime = new Date();
  // subTime = new Date(arrResult[j].user_library_subscription_date);
  // var currentTime = $.datepicker.formatDate('YYYY MM DD', new Date());
  var currentTime  = $.datepicker.formatDate('yy-mm-dd', new Date());
  console.log('Trying to make date limit be today: ' + currentTime + ' and dates: ' + arrUserData.userSubDate + ' / ' + arrUserData.clientSubscriptionDate);

  if (licType < 4 && arrUserData.userSubDate < currentTime){    //  Individual user
    console.log('Moving individual user to freebie...');
    licType = 1;
    arrUserData.LicType = 1;
  } else if (licType > 3 && arrUserData.clientSubscriptionDate < currentTime){    //  Site license user
    console.log('Moving site license user to freebie...');
    licType = 1;
    arrUserData.LicType = 1;
  }

  if ($('#searchLibrary').length){     //  Only create toggles if search popup...
    if (arrUserData.userPrefChromeLog > 0){
      console.log('Logging checked...');
      $('#loggingModeSearch').bootstrapToggle('on');
    } else {
      $('#loggingModeSearch').bootstrapToggle('off');
      recipientID = '';
    }
    // Update DD for showing toolbars
    console.log('Set toolbar dd to: ' + arrUserData.userPrefChromeToolbar);
    $('#toolbarDDSearch').val(arrUserData.userPrefChromeToolbar);
  }

  buildMultiselect();   //  Can create multi in parallel...

  console.log('setupSearchPage2 - for creating insert functions - after load and change in multiselect...') + console.log(tempArrLibrary);

  // console.log("After: " + localStorage.licType);

  arrSelectedLib = JSON.parse(localStorage.arrSelectedLib);
  console.log('CCCCCCheck for translate here: ') + console.log(arrSelectedLib);

  // console.log('Full library?... ') + console.log(arrLibrary);
  createSearchFave(tempArrLibrary);

  //Show search and favorites regarless of license type
  $('#searchDiv').attr('class', 'show');
  $('#buttonRowDiv').attr('class', 'show');
  // $('#freeFormDiv').attr('class', 'show');

  var showTranslate = 0;    // Zero out to default to Google Translate OFF


  $.each(arrSelectedLib,function (i, libName) {
    // console.log('Before check) Defining Translate feature availability on ' + libName.library_id + ' / ' + ' with Translate = ' + showTranslate);
    // //If any one of the default libraries has Translate, show it
    if(libName.user_library_translate > 0) {
        showTranslate = 1;
    }   //Flag to show Google Translate

    // console.log('After check) Defining Translate feature availability on ' + libName.library_id + ' with Translate = ' + showTranslate);
  });


  if(showTranslate > 0){
    //  If any selected lib has translate turned on, show it...
    setupTranslate();
  } else {
    TOLANG = "en";
    FROMLANG = "en";
    $('#translateDiv').attr('class', 'hide');
  }

  userAllowEditing = localStorage.userAllowEditing;   //  User pref created at login

  if (userAllowEditing == 0){      //TA functionality...hide EDITING
    $('.masterEditPermission').attr('disabled','disabled');    //Blocks user from ANY editing
  }

  if (localStorage.clientShowSupport > 0){$('#supportBtn').attr('class','btn btn-default show');}    //  Hide support button if client specified
  console.log('Show support...');

  $('#faveDiv').attr('class', 'show');

  if (displayName === null) {     //  Manual users won't have a full name
      displayName = email;
  }

  // console.log('Going to build autocomplete for language search...');

  $(document).on('click', 'button.favoriteBtns' ,function(){   //Fave buttons handler

    saveFeedback(this.id, 'chrome_Fave');

  });     //End favorite buttons click...

  $(document).on('click', 'button.refresh' ,function(){   //Front buttons handler
  // $('.refresh').click(function(){
    //After flexmodal closes - might be too general...although the only place it's used on aSearch.html is to bump to CE...
    console.log('Refresh...from where?');
    window.location.href="aSearch.html";
  });

  $('[data-toggle="tooltip"]').tooltip();   //  Initialize Bootstrap tooltips

  $(document).on('change', '.userPrefs' ,function(){   //Front buttons handler
  // $('.userPrefs').change(function () {
    //  $('#console-event').html('Toggle: ' + $(this).prop('checked'))
    // console.log('Changing Chrome settings in Search popup...');
    // console.log('Value of toggle: ' + $('#loggingModeSearch').prop('checked'));

     // wordInsertMode = $("#insertMode").is(':checked') ? 1 : 0;
     var chromeLog = $("#loggingModeSearch").is(':checked') ? 1 : 0;
     var chromeToolbar = $("#toolbarDDSearch").val();

     // console.log('Changing Chrome Logging to: ' + chromeLog);
     //
     // console.log('Turning Logging Pref OFF...zero out recipientID...');
     chrome.runtime.sendMessage({ msg: "updateUserPrefs", log: chromeLog, toolbar: chromeToolbar});

     arrUserData.userPrefChromeLog = chromeLog;
     arrUserData.userPrefChromeToolbar = chromeToolbar;

    localStorage.userDetails = JSON.stringify(arrUserData);
    // console.log("Trying to update local array: ") + console.log(arrUserData);

       var arrTempUserData = {
         userID: userID,
         fullName: '',
         userPrefWordInline: '',
         userPrefChromeLog: chromeLog,
         userPrefChromeToolbar: chromeToolbar,
         sender: 'updateChromePrefs'
       }

       // console.log("Going to send this array to update user info: ") + console.log(arrTempUserData);
       updateUserPrefs(arrTempUserData);   //  Call sub in web_background
       $('#flexModalHeader').html('Refresh any open pages...');
       $('#flexModalMsg').html("<p>Your change has been saved. <p></p>Please refresh any open pages to make your changes stick.</p>");
       $('#flexModal').modal('show');

  });   //  End CHANGE handler for changing prefs
}     //  End Setupsearchpage2

function setupPopupMenuBtns(){
  console.log('Set up popup menu...');

  $('.manageLibrary').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'manageLibrary';
    openNewWindow(address, context);
  });

  $('.activeComment').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'activeComment';
    openNewWindow(address, context);
  });

  $('.activateLibraryModal').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'activateLibraryModal';
    openNewWindow(address, context);
  });

  $('.reviewFeed').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'feed';
    openNewWindow(address, context);
  });
  $('.accountPage').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'account';
    openNewWindow(address, context);
  });


  $('.newCommentModal').click(function(){
    if ($(this).hasClass("addNewPermission")) return;
    console.log('clicking newCommentModal...');
    var address = 'annotateLibrary.html';
    var context = 'newComment';

    openNewWindow(address, context);

  });

  $('.newGroupModal').click(function(){
    if ($(this).hasClass("addNewPermission")) return;
    var address = 'annotateLibrary.html';
    var context = 'newGroup';

    openNewWindow(address, context);

  });

  $('.newLibraryModal').click(function(){
    if ($(this).hasClass("addNewPermission")) return;

    var address = 'annotateLibrary.html';
    var context = 'newLibrary';

    openNewWindow(address, context);
  });


  $('#logOutBTN').click(function(){
    console.log('Clicking logout on Search page...')
    // firebase.auth().signOut();
    chrome.runtime.sendMessage({ msg: "signOut" });  //Call background.js sub
    self.location.href='aHome.html';
    chrome.browserAction.setPopup({   //Sets popup to last visited
      popup: 'aHome.html'   // Open this html file within the popup.
    });
  });
}

function setupTranslate(){

  console.log('Set up fucking translate...');

  $.getJSON(baseURL + 'languages.json', function (data) {
        // console.log('Raw array: ') + console.log(data);
        $('#fromLang').autocomplete({
               source: data,
               select: function (e, ui) {
                   e.preventDefault(); // <--- Prevent the value from being inserted.
                  //  $('#meta_search_ids').val(ui.item.value);
                   $(this).val(ui.item.label);
                   FROMLANG = ui.item.value;
                   localStorage.fromLang = FROMLANG;
                   // console.log('Code: ' + FROMLANG);
               }
           });
           $('#toLang').autocomplete({
                  source: data,
                  select: function (e, ui) {
                      e.preventDefault(); // <--- Prevent the value from being inserted.
                     //  $('#meta_search_ids').val(ui.item.value);
                      $(this).val(ui.item.label);
                      TOLANG = ui.item.value;
                      localStorage.toLang = TOLANG;
                      // console.log('Code: ' + TOLANG);
                  }
              });
  });

  if (localStorage.fromLang == null){
    console.log('Set fromLang to default - en');
    FROMLANG = "en";      //Set defaults for translation
  } else {
    FROMLANG = localStorage.fromLang;
    console.log('Set fromLang to localStorage value: ' + FROMLANG);
  }
  if (localStorage.toLang == null){
    TOLANG = "en";
  } else {
    TOLANG = localStorage.toLang;
    // console.log('2) Using TO language: ' + TOLANG + localStorage.toLang);
  }

  // console.log('3) Using TO language: '+ TOLANG);

  if (localStorage.dualResp == null){
    DUALRESP = false;      //Set defaults for translation
  } else {DUALRESP = localStorage.dualResp;}

  $('.dualresp').change(function () {
    if ($('#singleResponse').is(':checked')) {
        // console.log('Just one responnse please...');
        $('#dualResponse').attr('checked', false);
        DUALRESP = false;
      }

    if ($('#dualResponse').is(':checked')) {
        // console.log('TWO responnse please...');
        $('#singleResponse').attr('checked', false);
        DUALRESP = true;
      }
  });

  $('#translateDiv').attr('class', 'show');
}

function createSearchFave (arrLibrary) {

  console.log('Create faves...toolbars and popup...');

  arrSelectedGroup = JSON.parse(localStorage.arrSelectedGroup);

  var i = 0;    //  Counter for freebie users...
  var increment = 0;    //  increment - default to zero
  console.log('Not a freebie we hope...with i: ' + i);
  if (licType === 1) {
    console.log('Freebie...');
    increment = 1;
  }

  if ($('#searchDiv').length || $('#searchLibraryTB').length || $('#favoriteBtnsSB').length){    //  Only create if page is Insert/Search

    var faveLabel;
    arrTempFave = $.grep(arrLibrary, function(comment){ // just use arr
      if (comment.userFavorite > 0){
        return true;
      }
    });

    arrTempFave.sort(function(a, b) {
      var aName = a.currentLabel.toLowerCase();
      var bName = b.currentLabel.toLowerCase();
      return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    });

    // console.log('Fave array: ') + console.log(arrTempFave);

    var searchArray = [];     //  Wipe the array to avoid dupes

    var libLength = arrLibrary.length;

    // console.log('length of library: ' + libLength);

    $.each(arrSelectedGroup,function(g, group){      //Cycle through each group of Comments
    // console.log('Processing each group...') + console.log(arrSelectedGroup);

      $.each(arrLibrary, function(c, comment){

        if(comment.group_id === group.group_id && comment.group_detail_comment_active == 1 && comment.library_detail_group_active > 0){

            if (libLength < 150){     //  compact libraries use full text of comment
              var displayLabel = comment.currentLabel.toUpperCase() + ' | ' + comment.tooltipText;
              searchChar = 1;     //  Set min value of matching text - 1 for < 150 items, 2 for > 150
            } else {        //  longer libraries use label and group
              var displayLabel = comment.group_name.toUpperCase() + ' | ' + comment.currentLabel;
              searchChar = 2;     //  Set min value of matching text - 1 for < 150 items, 2 for > 150
            }
            //  Create searchArray for Insert predictive search...
            searchArray.push({category: comment.group_name, label: displayLabel, id: comment.comment_id, comment: comment.tooltipText});
        }   //  End IF for a Comment's Group matching current Group
      });   //  End Loop through Library for a specific Group
    }); //  End EACH for a comment group


    $.each(arrTempFave, function(c, fave){
    //  Create favorites (if paid/trial user)
      if (i < 6){
      // if (licType > '1'){     //  Paid, trial, or institutional user
        if (fave.group_detail_comment_favorite > 0){    //Add buttons for front/favorites
          i = i + increment;    // paid/trial users will increment by zero
          console.log('Counting for faves: ' + i + ' licType: ' + licType + ' increment ' + increment);
          if (fave.currentLabel.length > 18){
              faveLabel = fave.currentLabel.substring(0,18)
              faveLabel = faveLabel.trim() + '...';
            // console.log('Favorite label: ' + faveLabel + ' / ' + comment.currentLabel.length);
          } else {
            faveLabel = fave.currentLabel;
          }

          if(arrUserData.userPrefChromeToolbar > 0){    // Load favorites into sidebar/toolbar
            $('#favoriteBtnsTB').append($('<button \
            class="btn btn-primary btn-sm favoriteBtns btn-space"\
            data-toggle="tooltip"  data-container=\"body\" data-placement=\"left\" title="'+ fave.tooltipText +'"\
            name = "'+ faveLabel + '"\
            id= "'+ fave.comment_id +'">'+ faveLabel +'</button>'));

            $('#favoriteBtnsSB').append($('<button \
            class="btn btn-primary btn-sm favoriteBtns btn-space"\
            data-toggle="tooltip"  data-container=\"body\" title="'+ fave.tooltipText +'"\
            name = "'+ faveLabel + '"\
            id= "'+ fave.comment_id +'">'+ faveLabel +'</button>'));
          }

            $('#favoriteBtns').append($('<button \
            class=\"btn btn-primary btn-sm favoriteBtns btn-space\"  data-container=\"body\" data-toggle=\"tooltip\" title=\"'+ fave.tooltipText +'"\
            name = "'+ faveLabel + '"\
            id= \"'+ fave.comment_id +'\">'+ faveLabel +'</button>'));
        }
      // } else {    //Freebie user - give them a 'learn more' button
    }
  });
}   //  End check for Insert page to only create if needed

  if (licType === 1 && ($('#searchDiv').length || $('#searchLibraryTB').length || $('#favoriteBtnsSB').length)){

        $('#favoriteBtnsTB').append($('<a class=\'btn btn-success btn-sm btn-space accountPage\' data-toggle=\"tooltip\" title=\"License Annotate PRO to get favorite buttons AND hundreds of additional pre-written comments.\">License Annotate...</a>'));

        $('#favoriteBtnsSB').append($('<hr><a class=\'btn btn-success btn-sm accountPage\' data-toggle=\"tooltip\" title=\"License Annotate PRO to get favorite buttons AND hundreds of additional pre-written comments.\">License Annotate...</a>'));

        $('#favoriteBtns').append($('<hr><a class=\'btn btn-success btn-sm accountPage\' data-toggle=\"tooltip\" title=\"License Annotate PRO to get favorite buttons AND hundreds of additional pre-written comments.\">License Annotate PRO...</a>'));
  }

  // console.log('Now init tooltips...');
  $('[data-toggle="tooltip"]').tooltip();    //  Now init tooltips
  //  Now predictive search...

  console.log('Made it to createPredictiveSearch sub...for predictive search with array: '); // + console.log(searchArray);

  // This works for all 3 predictive searches (?)
    $.widget('custom.catcomplete', $.ui.autocomplete, {
     _create: function () {
       this._super();
       this.widget().menu('option', 'items', '> :not(.ui-autocomplete-category)');
     },
     _renderMenu: function (ul, items) {
       var that = this,
         currentCategory = '';
       $.each( items, function (index, item) {
         var li;
         if (item.category !== currentCategory) {
           ul.append('<li class="ui-autocomplete-category"><b>' + item.category + '</b></li>');
           currentCategory = item.category;
         }
         li = that._renderItemData(ul, item);
         if(searchArray.length > 150){
           li.append('<p>' + item.comment + '</p>');
         }
         if (item.category) {
         //   // li.attr('aria-label', item.category + ' : ' + item.label);
           li.attr( "data-value", item.comment );
         }
       });
     }
   });

 if(arrUserData.userPrefChromeToolbar > 0){   //  Build for sidebar/toolbar

   $(document).on('click', '.closeSidebarBtn', function(){
   // $('.closeSidebarBtn').click(function(){
     console.log('Please close the sidebar...');
     localStorage.showTB = 0;
     chrome.runtime.sendMessage({ msg: "closeSidebar1"});
   });

  //Now build sidebar DDs for each library...
  arrSelectedGroup = JSON.parse(localStorage.arrSelectedGroup);
  console.log('Selected Lib array: ') + console.log(arrSelectedLib);
  console.log('Groups to use for new menu: ') + console.log(arrSelectedGroup);

  var libDDname;
  var groupNameHTML;
  var li;
  var aComment;

  $.each(arrSelectedLib, function(i, lib){
    if (lib.library_name.length > 15){
      libDDname = lib.library_name.substring(0, 15) + '...';
    } else {
      libDDname = lib.library_name;
    }
    var libDDBtn = '<div class="spacer-5"></div><button id="btnDD_' + lib.library_id + '" class="btn btn-success scrollCommentsBtn" data-toggle="dropdown" type="button">' + libDDname + '&nbsp;<span class="caret "></span></button><ul id="libDD_' + lib.library_id + '" class="dropdown-menu firstLevelDD" style="display: none;"></ul>'

    $('#librarySbDd').append(libDDBtn);

    //  dropdown-toggle
    //  data-toggle="dropdown"
    console.log('Library client ID: ' + lib.client_id + ' / ' + arrUserData.LicType);
    console.log(arrUserData);

    if (lib.client_id === 1 && arrUserData.LicType < 3){
      console.log('11trees library...add purchase message...for trial and free users...');
      groupNameHTML = '<li id="upsellMsg" class="dropdown-submenu accountPage btnDD_' + lib.library_id +'" style="display: none"><a href="#"><b>License me!</b></a>';
      $('#libDD_' + lib.library_id).append(groupNameHTML);
    }

    $.each(arrSelectedGroup,function(i, group){      //Cycle through each group of Comments
      // console.log('On group...') + console.log(group.group_name);
      if (group.libraryID == lib.library_id){
      if (group.group_name.length > 16){
        group.group_name = group.group_name.substring(0,16) + '...';
      }
      groupNameHTML = '<li id="groupLI_' + group.group_id + '"class="dropdown-submenu btnDD_' + lib.library_id +'" style="display: none"><a href="#"><b>' + group.group_name + '</b></a><ul id="groupDD_' + group.group_id + '_' + group.libraryID + '"class="dropdown-menu dropdown-menu-right"></ul>';
      $('#libDD_' + lib.library_id).append(groupNameHTML);
      // window.localStorage['group_' + group.group_id] = JSON.stringify(arrTempGroup);
      // var arrTempGroup = [];    //to hold an array for one comment group
      // var lsGroupName = window.localStorage['group_' + group.group_id]
      // console.log('Group array...') + console.log(lsGroupName);
      // arrTempGroup = JSON.parse(lsGroupName);

      arrTempGroup = $.grep(arrLibrary, function(groupTemp){ // just use arr
        return groupTemp.group_id === group.group_id;
      });

      $.each(arrTempGroup,function(i, comment){
        if (comment.currentLabel.length > 18){
          comment.currentLabel = comment.currentLabel.substring(0,16) + '...';
        }
        if (comment.currentText.length > 200){
          comment.currentText = comment.currentText.substring(0,200) + '...';
        }

        li = $('<li/>')
           .appendTo('#groupDD_' + group.group_id + '_' + group.libraryID);
        aComment = $('<a/>')
           .addClass('commentDD')
           .attr('id', comment.comment_id)
           // .attr('href', '#')
           .attr('title', comment.tooltipText)
           // .attr('tabindex', '-1')
           .attr('data-toggle', 'tooltip')
           // .attr('trigger', 'manual')
           .attr('data-placement', 'top')
           // .attr('data-container', 'body')
           .attr('text', comment.currentLabel)
           .text(comment.currentLabel)
           .appendTo(li);

    });   // END loop for each COMMENT in a Group
  }   //  End IF for matching libraryID to add a Group
  });   // END loop for each GROUP
});   // END loop for each Library

  //  Build predictive search
 $("#searchLibrarySB").catcomplete({      //For toolbar
   open: function () {
     //after menu is open set width to xxx px
     $('.ui-menu').width(180);
     $('.ui-menu').css({
       'overflow-wrap': 'break-word',
       'word-wrap': 'break-word',
       'height': '550px',
       'position': 'absolute',
       'z-index': '9999',
       'overflow-y': 'scroll',
       'overflow-x': 'hidden'
     });
   },
   delay: 0,
   minLength: searchChar,
   source: searchArray,  //  passed to this sub from global aSearch.js variable
   select: function (event, ui) {
     // console.log('Going to insert: " + ui.item.label + ' / id: ' + ui.item.id);
     //Now going to trim away the label, which we've included in the search
     //view for user convenience. The label is separated from the body by ' | '
     var obj = searchArray.filter(function (obj) {
         return obj.id === ui.item.id;
     })[0];

    //  Search full library so we send full data to the record feedback sub
    saveFeedback(ui.item.id, 'chrome_Search_Sidebar');
     return false;
     }
 });

 $("#searchLibraryTB").autocomplete({      //For toolbar
   open: function () {
     //after menu is open set width to xxx px
     $('.ui-menu').width(900);
     $('.ui-menu').css({
       // 'overflow-wrap': 'break-word',
       // 'word-wrap': 'break-word',
       'white-space': 'nowrap',
       'height': '25px',
       'position': 'absolute',
       'z-index': '999999999',
       'overflow-y': 'scroll',
       'overflow-x': 'hidden'
     });
   },
   delay: 0,
   minLength: searchChar,
   source: searchArray,  //  passed to this sub from global aSearch.js variable
   select: function (event, ui) {
     // console.log('Going to insert: " + ui.item.label + ' / id: ' + ui.item.id);
     //Now going to trim away the label, which we've included in the search
     //view for user convenience. The label is separated from the body by ' | '
     var obj = searchArray.filter(function (obj) {
         return obj.id === ui.item.id;
     })[0];


    saveFeedback(ui.item.id, 'chrome_Search_Topbar');
     return false;
     }
 });

  //  Now history...get recipientID from background and then send to getFeedback to pull data and process a table...
  chrome.runtime.sendMessage({ msg: "getRecip"}, function(tempRecipientID) {
    recipientID = tempRecipientID;
    if (recipientID != ''){
      console.log('Call getFeedback for: ' + recipientID);
      //  Pull total comments for total count
      getFeedback('authorSummary', userID, recipientID, 0, 1, '', '', setupHistory1);
    } else {
      // console.log('No data in history - hide history...');
      var arrEmpty = [];
      setupHistory2(arrEmpty);    //Send empty array so code runs...
    }
  });
}    // End of check for chromeLogging...

 $("#searchLibrary").catcomplete({
   open: function () {
     //after menu is open set width to xxx px
     $('.ui-menu').width(275);
     $('.ui-menu').css({
       'overflow-wrap': 'break-word',
       'word-wrap': 'break-word',
       'height': '250px',
       'position': 'absolute',
       'z-index': '9999999',
       'overflow-y': 'scroll',
       'overflow-x': 'hidden'
     });
   },
   delay: 0,
   minLength: searchChar,
   source: searchArray,  //  passed to this sub from global aSearch.js variable
   select: function (event, ui) {
     // console.log('Going to insert: " + ui.item.label + ' / id: ' + ui.item.id);
     //Now going to trim away the label, which we've included in the search
     //view for user convenience. The label is separated from the body by ' | '
     var obj = searchArray.filter(function (obj) {
         return obj.id === ui.item.id;
     })[0];

     //  Search full library so we send full data to the record feedback sub

    saveFeedback(ui.item.id, 'chrome_Search_Popup');
     // arrLibrary = JSON.parse(localStorage.arrLibrary);
     // var obj2 = arrLibrary.filter(function (obj2) {
     //     return obj2.comment_id === ui.item.id;
     // })[0];
     //
     // chrome.runtime.sendMessage({ msg: "saveFeedback", obj: obj2, source: 'chrome_Search'});
     //
     // // var selectedComment = obj.comment;    //  this value is set in background.js when searArray is built
     // insertText(obj2);
     return false;
     }
 });

  // $(document).on('focus', '.dropdown-submenu', function(){      //  New dropdown in sidebar - scrolling
  //   /* your code */
  //   console.log('Tabbing through  ...' + this.id);
  //   $('#groupDD_' + this.id).show();
  // });

}   //  End SETUP FAVEs and predictive search

function saveFeedback(id, context){
  console.log('In saveFeedback...now looking at localStorage version of arrLibrary: ');
  // console.log(localStorage.arrLibrary);

  arrLibrary = JSON.parse(localStorage.arrLibrary);
  var obj2 = arrLibrary.filter(function (obj2) {
      return obj2.comment_id === id;
  })[0];

  console.log('Selected comment text: ' + obj2.currentText);
  try {     //  Now check for brackets...
    chrome.tabs.query({active: true, currentWindow: true}, function(arrayOfTabs) {
      var activeTab = arrayOfTabs[0];   //  so wildcard popup can return to correct tab

      if (obj2.currentText.includes("[[") === true){
         var wildcarURL;
         wildcarURL = "chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/modules/wildcard.html";
         wildCardPopup = window.open(wildcarURL, 'wildcard', 'height=480,width=780');
         // wildCardPopup.constructCommentDiv = constructCommentDiv;
         wildCardPopup.activeTabId = activeTab.id;
         wildCardPopup.obj2 = obj2;
         wildCardPopup.context = context;
         wildCardPopup.FROMLANG = FROMLANG;
         wildCardPopup.TOLANG = TOLANG;
         wildCardPopup.DUALRESP = DUALRESP;
      } else {
        chrome.runtime.sendMessage({ msg: "saveFeedback", obj: obj2, source: context});
        insertText(obj2, activeTab.id);
        console.log('Trying to message background from popup/TB with long-lived port...from source: ' + context);
        var port = chrome.runtime.connect({name: "saveFeedback"});
        port.postMessage({obj: obj2, source: context});
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
    });
  } catch (err){
    console.log('Page must be refreshed...' + err)
    alert("Annotate PRO was not able to insert text into the page - sorry! \n\nUsually this happens when you\'ve just installed AP but not yet refreshed any open web pages. Or we\'ve updated AP and your open pages have an outdated version.\n\nRefresh any open pages and try again.")
  }
}

// function insertWildcard(htmlDiv, obj2, context){
//   console.log('Received: ') + console.log(htmlDiv);
//   var updatedComment = htmlDiv;
//   obj2.currentText = updatedComment;
//   obj2.user_comment_use_custom = 1;
//   console.log('Sending updated obj: ') + console.log(obj2);
//   wildCardPopup.close();
//   insertText(obj2);
//   chrome.runtime.sendMessage({ msg: "saveFeedback", obj: obj2, source: context});
//   console.log('ending insertwildcard sub...');
// }

// function closeWildcard(){
//   wildCardPopup.close();
// }

function setupHistory1(arrRecipCount){
  //  Get total count for this recipient

  totalRows = arrRecipCount.countFB;
  $('#commentCount').text(totalRows);

  //  Now get first 50 comments...
  getFeedback('recipDetails', 0, recipientID, 0,'1','','',setupHistory2);
}

function setupHistory2(arrRecipHistory){
  //  Load last 50 comments so they're ready...
  console.log('setupHistory2 - Made it to history2 with ') + console.log(arrRecipHistory);

  if (arrRecipHistory.length > 0 && recipientID != ''){
    console.log('Setting recipient data...') + console.log(arrRecipHistory);
    var recipName = arrRecipHistory[0].anno_fb_recip_ext_name;
    if (recipName.length > 20){
      recipName = recipName.substring(0,18) + '...';
    }
    var avatarURL = arrRecipHistory[0].anno_fb_recip_avatar_url;
    if (avatarURL == ''){   //  If we don't have a pic, show their name in top toolbar
      $('#recipNameTB').text(recipName);
    }
    $('#recipNameSB').text(recipName);
    $("#avatarImgSB").attr("src",avatarURL);
    $("#avatarImgTB").attr("src",avatarURL);
    $('#recipHistoryDivSB').show();
    $('#recipAvatarTB').show();
    $('#recipHistoryDivTB').show();
    $('#faveAreaSB').removeClass('sbPadding');

    var clickLink;
    // if ($('#searchLibraryTB').length){      //Are we showing top toolbar?
      console.log('Show top toolbar with history...licType: ' + localStorage.licType);
      $('#feedbackHistoryTableBody').empty();

      var maxHistory;
      if (localStorage.licType == 1){
        maxHistory = 5;
      } else {
        maxHistory = totalRows;
      }

      $.each(arrRecipHistory,function(i,comment){
        // console.log('Zooming throuhgh history. On: ' + i + ' max allowed: ' + maxHistory);
        if (comment.anno_fb_ext_sys_id == '1' || comment.anno_fb_ext_sys_id == '2'){
          clickLink = "<a href='" + comment.anno_fb_url_target + "' target='_blank'>" + comment.anno_fb_create_date + "</a>";
        } else {
          clickLink = comment.anno_fb_create_date;
        }
        if (i === maxHistory){
          // console.log('Exit the history loop...');
          if (localStorage.licType == 1){
            $('#feedbackHistoryTableBody').append(
              "<tr>\
              <td colspan='2' class='aligncenter'><a class='btn btn-primary' data-toggle='tooltip' data-placement='bottom' title='License Annotate PRO to get a full history of feedback to your students...' tabindex='-1' href='chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/accountChrome.html' target='_blank'>Get a full history...</a></td>\
              </tr>");
          }
          return false;
        }
        $('#feedbackHistoryTableBody').append(
          "<tr>\
          <td class='small aligncenter'>" + clickLink + "</td>\
          <td id = '" + comment.anno_fb_id + "' class='wraptableTD small alignleft'>" + comment.anno_fb_comment_text + "</td>\
          </tr>");
      });
      $('#recipHistoryDivSB').click(function(){
        console.log('Clicking on recipient - show history modal...');
        var recipHistURL;
        recipHistURL = "chrome-extension://clpoilnjjdbfjinifhmcfddhjgneajle/modules/recipHistory.html";
        recipHistPopup = window.open(recipHistURL, 'History', 'height=480,width=700,scrollbars=yes,resizable=yes,');
        recipHistPopup.totalRows = totalRows;
        recipHistPopup.arrRecipHistory = arrRecipHistory;
        recipHistPopup.recipName = recipName;
        recipHistPopup.recipID = recipientID;
        recipHistPopup.FBUID = FBUID;
      });
    // }    //  End check for top toolbar
  } else {
    $('#recipHistoryDivSB').hide();
    $('#recipAvatarTB').hide();
    $('#recipHistoryDivTB').hide();
    $('#faveAreaTB').removeClass('col-md-5');
    $('#faveAreaTB').addClass('col-md-10');
  }
}


//Google Analytics code...records page view (aSearch.html)
// var _gaq = _gaq || [];
//   _gaq.push(['_setAccount', 'UA-18355202-2']);
//   _gaq.push(['_trackPageview']);
//
// (function() {   //Google Analytics
//   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
//   ga.src = 'https://ssl.google-analytics.com/ga.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
// })();

//End Google Analytics
