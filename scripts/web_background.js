
//TODO:   //search for https://localhost/ and flip prod/dev 
  //  1) make sure URL for clicking through to purchase is updated from localhost - 2 places (cancel & purchase)
  //  2) update URL for openNewWindow function (local/production)

//URLs for scripts
// var baseURL = "https://localhost/AnnotateX/Scripts/Dev/";    //local server - macOS
var baseURL = "https://www.11trees.com/annotate/scripts/prod/";									//production

var arrLibrary = [];  //Hold library for global use
var searchArray = [];  //Hold search array - for predictive search (?)

var arrAvailableLib = [];   //  Hold details of available libraries for use (to be activated)
var arrActiveLib = [];    //  Holds ACTIVE library detail
var arrSelectedLib  = [];   //  Subset of Active - details on selected Libs

var arrClickedLib = [];    //  Selected Libraries (from multiselect - so concise array)

var arrAvailableGroup = [];   //  Holds AVAILABLE GROUP detailed list
var arrActiveGroup = [];    //  Hold active comment groups
var arrSelectedGroup = [];    //  Hold SELECTED Group (after picking Libraries)
// var arrInsertName = [];   //  Array to hold just the name(s) associated with the selected libraries to appear as author of Word Comments

var activeCommentGroup;   //  Store current choice for convenience/speed

var newCommentID = 0;     //    Holds counter for new comment

var userID = Number(localStorage.userID);
var licType = localStorage.licType;
var clientID = localStorage.clientID;

console.log('Firing up web_background.js file...');

function buildMultiselect(){    //  Will always use ACTIVE libraries...
  arrActiveLib = JSON.parse(localStorage.arrActiveLib);
  console.log('Active Libs going into build multiselect: --------->') + console.log(arrActiveLib);

  showTranslate = 0;      //  Zero out to start...
  var currentTime = new Date();
  var subTime;    //  Hold library expiration date
  var timestamp;  //  check whether date is valid (if it's zero or another non-date)
  var arrInsertName = [];

  arrClickedLib = [];
  $('#ddLibName').empty();    //  clean out previous multiselect choices...

  $.each(arrActiveLib,function (i, libName) {      //  Cycle through each available library
    // if (libName.user_library_library_active == 1){
      selectedLibrary = 0;   //  Tracks whether a specific library is selected
      subTime = new Date(libName.user_library_subscription_date);

      // console.log('Building multiselect DD: ' + libName.library_id + ' with subscription date ' + subTime);

      //  Case where a library has an 'insert name' associated with it...have to TEST to see if all libraries selected have the same name and, if the name <> null, use it in place of the user's name for inserting comments into Word. This is Word-specific functionality to support corporate clients who want a single name on comments regardless of which editor/proofer does the work.

      timestamp = Date.parse(subTime)

      //  Use DB values to define whether a Lib should be checked
      //  selectedLib is 3: expired
      //  selectedLib is 1: selected
      //  selectedLib is 0: not selected
      if ((subTime < currentTime || isNaN(timestamp) == true) && userID != libName.library_author_id && licType < 4){
        selectedLibrary = 3;    //  This will disable a Library and make sure it is unselected
        // console.log('Disable library: ' + libName.library_id);
      } else if(libName.user_library_selected == 1){
        selectedLibrary = 1;
        // console.log('Selected lib - YES:' + selectedLibrary);
      } else {    //  Not a favorite
        selectedLibrary = 0;
        // console.log('Selected lib - NO: ' + selectedLibrary);
      }

      if (libName.user_library_selected == 1 || libName.user_library_selected === null){
        arrInsertName.push({name: libName.library_insert_name});
      // if (libName.library_insert_name != null) {displayName = libName.library_insert_name;}
      }

      var shortLibName;     //  Truncate for narrow Word viewing window
      if (libName.library_name.length > 30){
        if (libName.library_author_id === userID){
          shortLibName = '<b>' + libName.library_name.substring(0, 30) + '...</b>';
        } else {
          shortLibName = libName.library_name.substring(0, 30) + '...';
        }
      } else {shortLibName = libName.library_name;}

      //   Build Library multiselect DD and populate with selected/not selected
      if (selectedLibrary == 1){    //  This is a selected library
        $('#ddLibName').append($("<option data-container='#ddLibrarySelect'\
        value='" + libName.library_id + "' selected>" + shortLibName + "</option>"));

        //  Populate array of SELECTED libraries with data initially pulled from db - only on new load or refresh, when arrClickedLib will be empty
        arrClickedLib.push({library_id: libName.library_id, library_author_id: libName.library_author_id});
        // console.log('Loading default/selected libraries: XXXxxxxxxxxxxxxxxXXXXXXX');
      } else if (selectedLibrary == 3){    //  This is an expired library
        $('#ddLibName').append($("<option data-container='#ddLibrarySelect'\
        value='" + libName.library_id + "' disabled>" + shortLibName + "</option>"));
      }
      else {
        // console.log('Should append library but leave it unselected...');
        $('#ddLibName').append($("<option data-container='#ddLibrarySelect'\
        value='" + libName.library_id + "'>" + shortLibName + "</option>"));
      }
  }); //  End EACH for a library group

  var index;    //  For testing array for empty

  // console.log('Selected Library array: ') + console.log(arrSelectedLib);
  // localStorage.arrSelectedLib = JSON.stringify(arrSelectedLib);     //Store for use elsewhere...dialogs.

  //TODO: Does this need to go somewhere else?
  // if(arrSelectedLib && arrSelectedLib.length){    //  Fire off default or user choice library pull
  //     getComments(arrSelectedLib);
  //   }

  //  $('#example-select-onChange').multiselect('select', '1', true);   //  TODO: preselect default


  // console.log('Check to see ifff multiselect element exists...then create it...');
  // if ($('#ddLibName').length){ Removing because we now will know we have multiselect DD...    //  Do we have multiselect element?
  $('#ddLibName').multiselect({
       buttonWidth: '300px',
       buttonText: function (options) {
           if (options.length == 0) {
               return 'Choose a Library';
           } else {
               var selected = 0;
               options.each(function () {
                   selected += 1;
               });
               return selected +  ' Library(s) Selected ';
           }
       },
       buttonTitle: function() {},
       onChange: function(option, checked, select) {

        arrClickedLib = this.$select.val(); //  Array to hold selections: 4, 6, 102

        if (licType === '1'){
          // console.log('SSSSelected choices...and LicType: ' + licType) + console.log(arrClickedLib);    //  Simple array of choices
          $('#flexModalHeader').html('As a Forever Free user...');
          $('#flexModalMsg').html("<p>You can view all the libraries you might have created or gained access to, but as a Forever Free user you can only use the first 30 comments from your first authored Library - which we've conveniently made active and selected for you.</p><p></p><p>Of course you can always head over to your account and convert to a paid subscription - the change is instantaneous.</p>");
          $('#flexModal').modal('show');
        } else {    //  Okay to change selected libs
          // console.log('Active libraries...') + console.log(arrActiveLib);
          onChangeLibMulti(arrClickedLib);      //  Call function to handle change

        }
      }      // End ONCHANGE for multiselect -------
    });   //  End create multiselect...
  // } //  End CHECK to see if multiselect exists...

  console.log('Finished getting selected libraries...passing array back...');

  // console.log('Finished getting selected libraries...with array: ') + console.log(arrSelectedLib);
  // callback();    //  Return to whoever called you...
}   // END Build Multiselect...

function onChangeLibMulti(arrClickedLib){
  console.log('Clicked multiselect choices: ') + console.log(arrClickedLib);

  arrActiveLib = JSON.parse(localStorage.arrActiveLib);
  //  Empty out localStorage for previous Groups
  if (localStorage.arrSelectedGroup){
  arrSelectedGroup = JSON.parse(localStorage.arrSelectedGroup);
    console.log('Trying to empty localStorage...') + console.log(arrSelectedGroup);
     $.each(arrSelectedGroup, function(i, deleteGroup){      //  Cycle through each group of Comments
         var deleteGroupVarName = 'group_' + deleteGroup.group_id;
         console.log('Emptying fFFFor: ') + deleteGroupVarName;
         localStorage.removeItem(deleteGroupVarName);
     });
 }

 //  Now create array representing subset of available libraries and store as user pref
  arrSelectedLib   = arrActiveLib.filter(function(default_el){
     return arrClickedLib.filter(function(selected_el){
        return selected_el == default_el.library_id;
     }).length > 0
  });

  console.log('Filtered CZZZCchoices...with length '+ arrSelectedLib.length);

  $("#searchLibrary" ).empty();   //  Empty out divs that fill with library buttons/DDs
  $("#favoriteBtns" ).empty();   //  Favorite buttons on insert
  $("#ddDivDetails" ).empty();   //  Dropdowns per Group for insertion

  console.log('If toolbar, Call background page to signal iFrame to update...');
  chrome.runtime.sendMessage({ msg: "refreshIframe"});

  $('#loadList').empty();     //  Comment panels on Edit taskpane
  $('#sbLibDD_1').empty();     //  empty new DD

  $(document).off('click', 'button.favoriteBtns');  //  Kill events
  $(document).off('click', '.commentDD');  //  Kill events
  $(document).off('change', '.userPrefs');  //  Kill events

  console.log('Now going to send to pull/process library...selected data: ') + console.log(arrSelectedLib);;

  //------------- NOW I HAVE THE UPDATED LIST OF LIBs ------------//

  if (arrSelectedLib.length > 0){
    console.log('Updating after choosing from multi: ') + console.log(arrSelectedLib);
    updateLibActive(arrSelectedLib);     //  Send changes to DB and check insert name match
    if ($('#searchDiv').length){    //  Am I on insertComment.html? If so, refresh...
      console.log('Now setup insert page with new data from multiselect...');
      setupSearchPage1(arrSelectedLib);    //  Now set up faves, DDs, search...if we're running on the Insert taskpane
    } else if($('#listView').length){    //  Edit pages?
      console.log('Now setup non-insert pages with new data from multiselect...');
      setupEditPage1(arrSelectedLib);
    } else if($('#activeComment').length){
      setupEditActiveView2(arrSelectedLib);
    }
  }   //  Make sure we have some Library choices before running
  else {
    localStorage.activeCommentGroup = 0;
    chrome.contextMenus.removeAll();						//blow away existing Annotate menu
    console.log("Wiped contextMenus in aSearch.js...");
    localStorage.searchArray = [];
    // clearOldHTML();
    // bgPullProcessLib(0);   //  Call pullLibrary ON CHANGE
    buildGroupDD('groupDD', 0);    //  No choices in multiselect so rebuild DD with basic choice
  }
}     //  END on change for Lib multiselect

function getFeedback(context, instructorID, recipID, pageOffset, filterFreeForm, filterFrom, filterTo, callback){

  //receivorID is for pulling data for a student - history of feedback etc.
  //page is the pagination value fobr displaying data in a tables
  //freeForm is 1/0 for showing JUST freeform or all feedback

  console.log('Running getFeedback with context: ' + context + ' filterFrom: ' + filterFrom); // + callback);

  if (filterFrom === 'NaN-NaN-NaN' || filterFrom === ''){
    filterFrom = ''
  } else {
    filterFrom = " AND anno_fb_create_date > '" + filterFrom  + "'";
  }

  if (filterTo === 'NaN-NaN-NaN' || filterFrom === ''){
    filterTo = ''
  } else {
    filterTo = " AND anno_fb_create_date < '" + filterTo + "'";
  }

  var url1 = baseURL + 'getFeedback.php';
  var url2 = '&userID=' + userID + '&licType=' + licType + '&clientID=' + clientID + '&instructorID=' + instructorID + '&recipID=' + recipID + '&pageOffset=' + pageOffset + '&filterFreeForm=' + filterFreeForm + '&filterFrom=' + filterFrom + '&filterTo=' + filterTo + '&context=' + context;

    $.ajax({
      type: 'POST',
      url: url1,
      data: url2,
      // dataType: 'text',
      dataType: 'json',
      success: function (arrFeedbackResult) {   // Details on selected libraries
        console.log('Returning array to callback...') + console.log(arrFeedbackResult);
        callback(arrFeedbackResult);   //ajax is complete - go back to whoever invoked you!
      },   // End Success

        error: function (jqXHR, textStatus, errorThrown) {
          console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
      }

    });   //  End ajax
}

function updateLibActive(arrSelectedLib){

  var arrInsertName = [];

  $.each(arrActiveLib,function(i, availLib){

    $.each(arrSelectedLib,function(i, chosenLib){
      // console.log('Checking lib: ' + availLib.library_id + ' and selected ' + chosenLib.library_id);
      if (availLib.library_id === chosenLib.library_id){      //  I've selected this Lib
        availLib.user_library_selected = 1;
        // console.log('user default');
        return false;   //  Break out of loop if match
      } else {
        availLib.user_library_selected = 0;
        // console.log('NOT user default');
      }
    }); //  End loop through chosen libraries

    //  After updating based on choices, create array to check insert name match
    if (availLib.user_library_selected == 1 || availLib.user_library_selected === null){
      arrInsertName.push({name: availLib.library_insert_name});
      // if (libName.library_insert_name != null) {displayName = libName.library_insert_name;}
    }
    availLib.user_id = userID;    //  Make sure we have the active user associated with each
  }); //  End loop through active libraries
  // if (arrSelectedLib && arrSelectedLib.length) {   //  If we've chosen something, store it and grab data
  localStorage.arrSelectedLib = JSON.stringify(arrSelectedLib);    //  Store selected libraries

  console.log('++++++++Storing update (adds and takes) to server: ') + console.log(arrActiveLib);
  localStorage.arrActiveLib = JSON.stringify(arrActiveLib);   //  Store locally

  $.ajax({
        type: 'post',
        url: baseURL + 'updateLibrarySelectionStatus.php',
        data: JSON.stringify(arrActiveLib),
        contentType: 'application/json',
        // traditional: true,
        success: function (data) {
            console.log('Was successful in sending data library choices to server...?');
        }
      });
      // } //else {    //  we've deselected all values
          //       localStorage.removeItem('library_id');
          //     }
    // console.log('AAAArray for matching names: ') + console.log(arrInsertName);
    if (arrInsertName.length > 0){
      var matchingInsertName = checkValuesSame(arrInsertName);
      // var matchingInsertName = arrInsertName.allValuesSame();

      // console.log('Matched names and: ' + matchingInsertName);

      //  Flag to check whether optional names (for comment text) match. Supports library design overriding name that appears on Word comment (Proofrerading International and other corporate clients)
      if (matchingInsertName === false){
        $('#flexModalHeader').html('The comment author names don\'t match...');
        $('#flexModalMsg').html("<div class=\"panel panel-default alignleft\"><div class=\"panel-body\" style=\"background-color: lightgreen\">The libraries you have selected have \'insert names\' associated with them - to specify the name that will appear in a comment inserted into Microsoft Word.<p></p<p>These names must match if you are to use multiple libraries at one time.</p><p></p><p>They don\'t.</p><p></p><p>Please either drop back to using only one library or contact the author of the libraries you are using to update the name associated with them.</p>");
        $('#flexModal').modal('show');
      } else {    //  Can use library_insert_name
        // localStorage.libraryInsertName = arrInsertName[0].name;
          if (arrInsertName[0].name){
            displayName = arrInsertName[0].name;    //Since they match, just use first one to set the value of the name used for inserting comments.
          } //  Else leave displayName alone...
      }
    } //  End check for non-zero array that is comparing insert names

}

// function updateGroupDD(){
//   console.log('UPDATEGROUPDD ---------- Back from pullLibrary and processLibrary - assume we have: ');
//   console.log(arrSelectedGroup);
//   console.log(arrActiveLib);
//   console.log(arrSelectedLib);
//
//   buildGroupDD('groupDD', arrSelectedGroup);
//
//   //  Create change listener
//   $('#groupDD').change(function(){
//     activeCommentGroup = $("#groupDD").val();
//     localStorage.activeCommentGroup = activeCommentGroup; // Store for easy replacement/use
//     if ($('#listView').length) {   //  We are in dialog window table view
//       // console.log('Found listView: ' + $('#listView').length + ' / ' + $('#tableView').length);
//       addList();      //hardcoded to list view only - auto load if there is an existing choice for Group
//     }
//     if ($('#tableCommentView').length) {    //  We are on taskpane list view
//       addCommentTable();
//       $('#commentColumn').show();
//     }
//   });
//
// } //  End updateDD callback after pull & process

// function buildSelectedGroupDD(arrSelectedGroup){
function buildGroupDD(groupDDid, arrTempGroup){

  $('#'+groupDDid).empty();   //  Empty out the Group drop dropdown
  console.log('In buildSelectedGroupDD for: ' + groupDDid) + console.log(arrTempGroup);

  var option = '<option value="choose">Choose a Comment Group...</option>';
  $('#' + groupDDid).append(option);

  if ($('.disableNonextensible')){
    console.log('I should disable some Groups...');
    var disableNonextensible = 1;
  }

  var disableGroup;
  var markInactive;
  var checkActive = 0;    //  binary to see if current activeCommentGroup is part of current set; make default choice if not

  if (arrTempGroup.length > 0){
    $.each(arrTempGroup, function(i, group){      //  Cycle through each group of Comments
      // console.log('Building DD for Groups - on: ' + group.groupID);

      if (group.groupActive == 0){
        markInactive = ' (inactive)';
      } else {
        markInactive = '';
      }

      if (disableNonextensible == 1 && group.libraryExtensible == 0 && group.groupAuthor != userID){
        disableGroup = 'disabled';
        // console.log('I will disable this Group...');
      } else {
        disableGroup = '';
        // console.log('I will NOT disable this Group...' + disableNonextensible + ' / ' + group.library_extensible);
      }


      if (group.group_id == activeCommentGroup){
        checkActive = 1;    //  Indicate activeCommentGroup is part of current set
        option = '<option ' + disableGroup + ' value="'+ group.group_id + '" selected>' + group.group_name + '</option>';
        $('#' + groupDDid).append(option);

        if ($('#listView').length) {   //  We are in taskpane list view
          console.log('Found listView: ' + $('#listView').length + ' / ' + $('#tableView').length);
          addList();      //hardcoded to list view only - auto load if there is an existing choice for Group
        }
        if ($('#tableCommentView').length) {    //  We are on dialog table view
          addCommentTable();
        }

      } else {
        option = '<option ' + disableGroup + ' value="'+ group.group_id + '">' + group.group_name + markInactive + '</option>';
        $('#' + groupDDid).append(option);
      }
    });
  if (checkActive === 0){   //  No activeCommentGroup OR choice isn't in current set.
    console.log('Set DD choice to default - Choose...');
    $('#' + groupDDid + ' option[value="choose"]').prop('selected', true)
  }
  }   //End check for array content

  // $('#groupDD').width(285);

  //  Create change listener
  $('#groupDD').change(function(){
    activeCommentGroup = $("#groupDD").val();
    localStorage.activeCommentGroup = activeCommentGroup; // Store for easy replacement/use
    if ($('#listView').length) {   //  We are in dialog window table view
      // console.log('Found listView: ' + $('#listView').length + ' / ' + $('#tableView').length);
      addList();      //hardcoded to list view only - auto load if there is an existing choice for Group
    }
    if ($('#tableCommentView').length) {    //  We are on taskpane list view
      addCommentTable();
      $('#commentColumn').show();
    }
  });

}     //  End buildGroupDD
//
// function setupPageMenuBtns(){   //  Main menu button listeners
//
//   $('.saveLibraryClose').click(function(){
//     // arrSelectedLib = JSON.parse(localStorage.arrSelectedLib);     //  Pull from localStorage
//
//     console.log('Trying to refresh - selected Libs = ') + console.log(arrSelectedLib);
//     localStorage.lastSync = 0;      //  So popup pulls fresh data...
//     // pullLibrary(arrSeglectedLib, Refresh1);
//     // getActiveLibraries('active', setupEditView1);
//     Refresh();
//
//   });
//
//   $('.refresh').click(function(){
//     //After flexmodal closes - might be too general...although the only place it's used on aSearch.html is to bump to CE...
//     localStorage.dialogEditSetting = "manageLibrary";
//     window.location.href="editLibrary.html";
//   });
//
//   $('.logOutBTN').click(function(){
//     console.log('Trying to log out...');
//     chrome.runtime.sendMessage({ msg: "signOut" });  //Call background.js sub
//     window.close()
//   });
// }

function sendPurchaseDeets(arrPurchaseDeets){
  $.ajax({
    type: 'post',
    url: baseURL + "purchaseAnnotate.php",
    // data: JSON.stringify(arrPurchaseDeets),
    // data: { arrPost: encodeURIComponent(JSON.stringify(arrPurchaseDeets))},
    data: { arrPost: JSON.stringify(arrPurchaseDeets)},
    // contentType: 'application/json',
    success: function(result){
        console.log('Success - created user and charged them...' + result);
        $('#flexModalHeader').html('Thank you!');
        if(arrPurchaseDeets.amount > 0){
          $('#flexModalMsg').html("<p>You are now subscribed to " + desc + ". You will receive a receipt via email.</p>");
        } else {      //  Freebie - no email receipt.
          $('#flexModalMsg').html("<p>You are now subscribed to " + desc + ".</p>");
        }
        $('#flexModalCloseBtn').addClass('refreshBtn');
        $('#flexModal').modal('show');
    },    //End async storage POST
    error: function (jqXHR, textStatus, errorThrown) {
      console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
      $('#flexModalHeader').html('Sorry! We could not complete the transaction');
      $('#flexModalMsg').html("Here's the error code: " + errorThrown + "</p><p></p><p>Feel free to contact us via our <a href='https://www.11trees.com/live/support/support-annotate-pro/'>support pages</a></p>");
      $('#flexModal').modal('show');
    }
  });   //End Ajax
}   //  End AJAX to send purchase details to server/Stripe


$(document).on('click', '.cancelSubBtn', function (e) {
  console.log('Clicked cancel: ' + this.id);

  // var address = "https://localhost/AnnotateX/AnnoWeb/annotateLibrary.html?action=cancel&btnId=" + this.id;
  var address = "https://www.11trees.com/annotate/library/annotateLibrary.html?action=cancel&btnId=" + this.id;

  console.log('Now open this URL: ' + address);
  chrome.tabs.create({'url': address});
  e.preventDefault();
});

$(document).on('click', '.purchaseBtn', function (e) {

  console.log('Clicked purchase: ' + this.id);

  // var address = "https://localhost/AnnotateX/AnnoWeb/annotateLibrary.html?fbUID=' + FBUIDaction + '&purchase&btnId=" + this.id;
  var address = "https://www.11trees.com/annotate/library/annotateLibrary.html?action=purchase&btnId=" + this.id;

  chrome.tabs.create({'url': address});

});     //  END click purchaseBtn handler

$(document).on('click', "button.newComment", function () {
  //Uses a class to call click event
  console.log('Trying to add a comment to list or table...');
 // if ($(this).hasClass("addNewPermission")) return;

 console.log('Made it past check for addNewPermission...');

  if ($('#loadCommentTable').length){
    console.log('Creating a new comment...');
    tableRow = "<tr class='annoRow' id = '" + newCommentID + "'><td>\
      <div class='hide' id='rowType" + newCommentID + "'>newComment</div>\
        <div class='col-xs-12 alignleft'><b>Label:</b></div>\
        <div class='col-xs-12'><textarea class='form-control custom_comment_label' rows='1' placeholder='Enter a custom label here...' id='comment_label" + newCommentID + "'></textarea></div>\
        <div class='col-xs-12 spacer-10'></div>\
        <div class='col-xs-12 alignleft'><b>Text:</b></div>\
        <div class='col-xs-12'><textarea class='form-control custom_comment_text' rows='3' placeholder='Enter custom Comment text here...' id='comment_text" + newCommentID + "'></textarea></div>\
        <div class='col-xs-12 aligncenter spacer-10'>\
        <a data-toggle='tooltip' data-placement='auto' title='Make a Comment ACTIVE or INACTIVE to show or hide it. There is no delete!'><input type='checkbox' id='chkComActive" + newCommentID + "'\
         data-toggle='toggle' data-width='110' data-off='Inactive' \
        data-on='Active' data-onstyle='success' data-offstyle='info'\
        data-size='small'></a>\
        <a data-toggle='tooltip' data-placement='auto' title='Make this Comment appear as a Favorite button for quick access.'><input type='checkbox' id='chkFave" + newCommentID + "'\
        data-toggle='toggle' data-width='110' data-on='Favorite' data-offstyle='info'\
         data-off='NOT Favorite' data-onstyle='success'\
         data-size='small'></a>\
        </div>\
        <div class='col-xs-12 aligncenter spacer-10'>\
          <button class='btn btn-primary updateLibraryBtn' data-toggle='tooltip' data-placement='auto' title='Click to update any and all changes you have made to this Comment Group.'>Save</button>\
        </div>\
      </td></tr>";

    $('#loadCommentTable').append(tableRow);
    // append(tableRow).prependTo("#loadCommentTable");

  }   //  End for check to see if TABLE exists

  if ($('#loadList').length){
    $('#loadList').append(
      "<div class='panel-group'>\
      <div class='panel panel-default'>\
        <div class='panel-heading annoRow' id='" + newCommentID+ "'>\
          <h4 class='panel-title'>\
            <div id='newCommentHeader" + newCommentID +"'><a data-toggle='collapse' href='#newCommentPanel" + newCommentID + "'>New Comment</a></div>\
          </h4>\
        </div>\
        <div id='newCommentPanel" + newCommentID + "' class='panel-collapse collapse in'>\
        <div class='panel-body'>\
        <div id='rowType" + newCommentID + "' class=' hide'>newComment</div>\
        <div class='row col-xs-12 alignleft spacer-10'>\
         <b>Label:</b>\
        </div>\
         <textarea class='form-control custom_comment_label' placeholder='Enter a custom label here...' rows='2' id='comment_label" + newCommentID + "'></textarea>\
        <div class='row col-xs-12 alignleft'>\
         <br><b>Text:</b>\
        </div>\
        <textarea class='form-control custom_comment_text' placeholder='Enter a custom Comment text here...' rows='5' id='comment_text" + newCommentID + "'></textarea>\
        <div class='col-xs-12 aligncenter spacer-10'>\
        <a data-toggle='tooltip' data-placement='auto' title='Make a Comment ACTIVE or INACTIVE to show or hide it. There is no delete!'><input type='checkbox' id='chkComActive" + newCommentID + "'\
         data-toggle='toggle' data-width='110' data-off='Inactive' \
        data-on='Active' data-onstyle='success' data-offstyle='info'\
        data-size='small'></a>\
        </div>\
        <div class='col-xs-12 aligncenter spacer-10'>\
        <a data-toggle='tooltip' data-placement='auto' title='Make this Comment appear as a Favorite button for quick access.'><input type='checkbox' id='chkFave" + newCommentID + "'\
        data-toggle='toggle' data-width='110' data-on='Favorite' data-offstyle='info'\
         data-off='NOT Favorite' data-onstyle='success'\
         data-size='small'></a>\
        </div>\
       </div> <!-- Body -->\      \
       <div class='panel-footer'>\
         <div class='container'>\
             <div class='col-xs-12 aligncenter spacer-10'>\
             <button class='btn btn-primary updateLibraryBtn' data-toggle='tooltip' data-placement='auto' title='Click to update any and all changes you have made to this Comment Group.'>Save</button>\
           </div>\
         </div>  <!-- Container for buttons -->\
         </div> <!--Footer -->\
        </div>  <!-- Collapse -->\
          </div>    <!-- Default -->\
      </div>");   //Panel group
  }     //  //  End for check to see if LIST VIEW exists

  $('#chkComActive'+ newCommentID).bootstrapToggle('on');
  // $('#chkFeedActive'+ newCommentID).bootstrapToggle();
  $('#chkFave'+ newCommentID).bootstrapToggle('off');

  $('#comment_label' + newCommentID).focus();      //  Put cursor in new label box

  $("body").tooltip({ selector: '[data-toggle=tooltip]' });

  newCommentID++;   //  Increment ID for new rows

});				//End Add New Comment Row


$(document).on('click', "button.sortCommentsBtn", function () {    //  BUTTON to pop SORT modal
// $('.sortCommentsBtn').click(function(){   //  BUTTON to pop modal
  if ($('.annoRow')[0]){
    addList();      //Populate panels in modal for easy sorting
    $('#sortCommentsModal').modal({
      backdrop: 'static',
      keyboard: false
    })
  } else {
    $('#flexModalHeader').html('Choose a Group...');
    $('#flexModalMsg').html("<p>You must first click on an available Group from the list on the left. If there are no Groups associated with this Library, click <b>New</b> in the Groups panel to create one.</p>");
    $('#flexModal').modal('show');
  }
});



$(document).on('click', "button#saveCommentBtn", function () {
  //Button on Modal used to save choicess...

  var comLibrary = $('#ddLibrarySelectNewComment').val();
  var comGroup = $('#ddActiveGroup').val();

  console.log('Trying to create new Comment for Library / Group: ' + comLibrary + ' / ' + comGroup);

  if ((comGroup > 0) && (comLibrary > 0)) {
      var arrTempComGroup = [];     //  Temp array to hold scrape of page...

      localStorage.modalChoice = 'normal';   //  Reset variable to avoid creating modal

      localStorage.activeCommentGroup = comGroup;   //  Save current Group selection so we default to it elsewhere...

      var comID = '';   //  Null - don't have a value...
      var comType = 'newComment';
      var groupAuthorID = userID;
      var groupComID = '';    //  Null - no value
      var comAuthorID = userID;
      var userComID = 0; // ID of Comment in anno_user_comment table
      var userCustomComID = 0;    //ID of row in anno_user_comment_table
      var userComAuthorID = userID;
      var comLabel = $('#comment_label').val();
      var comText = $('#comment_text' ).val();
      var comActive = $("#chkComActive").is(':checked') ? 1 : 0;
      var comOrder = 0;      //  We don't have an order because we're adding one comment.
      var comUseCustom = $("#chkUseCustom").is(':checked') ? 1 : 0;
      // feedActive= $("#chkFeedActive" + id).is(':checked') ? 1 : 0;
      var comFave = $("#chkFave").is(':checked') ? 1 : 0;

      //  TODO: form validation - must have picked values for Library and Group...
      //  Close modal and refresh underlying...

      // Now, create array regardless of new, customized, or owned...
        arrTempComGroup.push({
          comType: comType,
          userID: userID,
          licType: licType,

          comID: comID,
          comAuthorID: comAuthorID,
          comOrder: comOrder,

          groupID:  comGroup,
          libID:  0,  //  This value isn't used in this process

          groupComID: groupComID,
          groupAuthorID: groupAuthorID,

          userComID: userComID,     //  ID of comment for anno_user_comment table
          userCustomComID: userCustomComID,     //  ID of row in anno_user_comment table
          userComAuthorID: userComAuthorID,
          comLabel: comLabel,
          comText: comText,

          comActive: comActive,
          comUseCustom: comUseCustom,
          // feedActive: feedActive,
          comFave: comFave
        })
      // } else if (comType == 'userOwned'){

    console.log('Array I will upload via saveComment.php: ') + console.log(arrTempComGroup);

    localStorage.removeItem('group_' + comGroup);
    console.log('Remove local group comment array so edit uses new data...');

      $.ajax({
          type: 'post',
          url: baseURL + 'saveComment.php',
          data: JSON.stringify(arrTempComGroup),
          contentType: 'application/json',
          // traditional: true,
          success: function (data) {
              localStorage.lastSync = 0;
              localStorage.activeLibrary = comLibrary;   //Set library choice to the one we just worked on...
              localStorage.activeComment = comGroup;   //Set library choice to the one we just worked on...
              $('#saveCommentBtn').prop('disabled', true);    //To avoid double submission
              $('#randomAnimal').text(randomAnimal());
              $('#confirmSave').modal({      //on modal close reloads page
                backdrop: 'static',
                keyboard: false
              })

          }
      });
    }   //  End IF for checking entry of library and group

  else {    // Did not select Library and Group - pop message...

    console.log('No choices made - skip upload...')
    if (comLibrary == 0){
      $('#ddLibrarySelectNewComment').attr('size',3);
    }
    if (comGroup == 0){
      $('#ddActiveGroup').attr('size',3);
    }
  }
});				//End New Comments creation

$(document).on('click', "button#saveGroupBtn", function () {
  //Button on Modal used to save new Group...

  var groupLibrary = $('#ddSelectLibraryNewGroup').val();

  console.log('Trying to create new Group for Library: ' + groupLibrary);

  if (groupLibrary > 0) {
      var arrNewGroup = [];     //  Temp array to hold scrape of page...

      localStorage.modalChoice = 'normal';   //  Reset variable to avoid creating modal

      //  Close modal and refresh underlying...

      // Now, create array regardless of new, customized, or owned...
        arrNewGroup.push({
          userID: userID,
          libID:  groupLibrary,
          groupID: '',    //  Don't have a value for this - creating a Group
          groupName: $('#group_name').val(),
          groupDesc: $('#group_desc' ).val(),
          groupActive: '1',
          queryAction: 'newGroup'
        })
      // } else if (comType == 'userOwned'){

      console.log('Array I will upload via saveGroup.php: ') + console.log(arrNewGroup);

      $.ajax({
          type: 'post',
          url: baseURL + 'saveGroup.php',
          data: JSON.stringify(arrNewGroup),
          contentType: 'application/json',
          // traditional: true,
          success: function (data) {
              console.log('Was successful in sending data to server...?');
              localStorage.lastSync = 0;
              localStorage.activeCommentGroup = data;   //Set active group to the newly created one
              console.log('Created Group: ' + data);
              localStorage.activeLibrary = groupLibrary;   //Set library choice to the one we just worked on...
              $('#saveGroupBtn').prop('disabled', true);    //To avoid double submission
              $('#randomAnimal').text(randomAnimal());
              $('#confirmSave').modal({      //on modal close reloads page
                backdrop: 'static',
                keyboard: false
              })

          }
      });
    }   //  End IF for checking entry of library and group

  else {    // Did not select Library and Group - pop message...

    console.log('No choices made - skip upload...')
    if (groupLibrary == 0){
      $('#ddSelectLibraryNewGroup').attr('size',3);
    }
  }

});				//End New Group creation

$(document).on('click', "button#saveLibraryBtn", function () {
  //  Create a new library...

  var queryAction = 'newLibrary';

  // var libID = activeLibrary;    //Use active Library for updating details...
  var libID = '';   //  New Library - no ID
  var libName = $('#libraryNameModal').val();
  var libDesc = $('#libraryDescModal').val();
  var libInsertName = $('#insertNameModal').val();

  var libActive = $('#activeDDmodal').val();
  var libExtensible = $("#chkExtensibleModal").is(':checked') ? 1 : 0;
  var libSelected = $("#chkSelectedModal").is(':checked') ? 1 : 0;
  var libGoogleTranslate = $("#chkTranslateModal").is(':checked') ? 1 : 0;


  var url1 = baseURL + 'updateLibraryDetail.php';
  var url2 = '&user_id=' + userID + '&library_id=' + libID + '&clientID=' + clientID +
  '&libName=' + libName + '&libDesc=' + libDesc + '&libInsertName=' + libInsertName + '&libActive=' + libActive + '&libSelected=' + libSelected + '&libExtensible=' + libExtensible + '&libGoogleTranslate= ' + libGoogleTranslate + '&queryAction=' + queryAction;

  console.log('We own it...' + url2);

  ajaxJSON(url1, url2, queryAction);     //  Call sub to process AJAX call

});				//End New Library creation

$(document).on('click', "#licenseLibraryBtn", function () {
  //  Create a new library...

  var queryAction = 'licenseLibrary';
  var licenseLibID = $('#licensedLibID').text();

  console.log('Trying to send this LibID: ' + licenseLibID);

  // var libID = activeLibrary;    //Use active Library for updating details...
  var libID = $('#licensedLibID').text();
  var libName = '';
  var libDesc = '';
  var libInsertName = '';

  var libActive = 1;
  var libExtensible = '';
  var libSelected = 1;
  var libGoogleTranslate = 0;


  var url1 = baseURL + 'updateLibraryDetail.php';
  var url2 = '&user_id=' + userID + '&library_id=' + libID + '&clientID=' + clientID +
  '&libName=' + libName + '&libDesc=' + libDesc + '&libInsertName=' + libInsertName + '&libActive=' + libActive + '&libSelected=' + libSelected + '&libExtensible=' + libExtensible + '&libGoogleTranslate= ' + libGoogleTranslate + '&queryAction=' + queryAction;

  console.log('We licensed it...' + url2);

  localStorage.activeLibrary = licenseLibID;    //  Store for page refresh...

  ajaxJSON(url1, url2,queryAction);     //  Call sub to process AJAX call

});				//End New Library creation

$(document).on('click', "button#updateGroupBtn", function () {
  //Update after changes to GRoup modal edit

  console.log('Trying to update Group name and description...');

  var arrTempGroupDetail = [];     //  Temp array to hold scrape of page...

  var groupID;     //  group ID
  var groupName;    //  Group Name on page
  var libID = Number(localStorage.activeLibrary);
  var groupDesc;
  var groupActive;
  var queryAction;

  groupID = localStorage.activeCommentGroup;
  groupName = $('#update_group_name').val();
  groupDesc = $('#update_group_desc').val();
  groupActive = $("#update_chkActiveGroup").is(':checked') ? 1 : 0;
  queryAction = 'updateGroup';

  arrTempGroupDetail.push({
    userID: userID,
    libID: libID,
    groupID: groupID,
    groupName: groupName,
    groupDesc: groupDesc,
    groupActive: groupActive,
    queryAction: queryAction
  });

  console.log('Array I will upload via saveGroup.php: ') + console.log(arrTempGroupDetail);

    $.ajax({
        type: 'post',
        url: baseURL + 'saveGroup.php',
        data: JSON.stringify(arrTempGroupDetail),
        contentType: 'application/json',
        // traditional: true,
        success: function (data) {
            console.log('Was successful in sending data to server...?');
            $('#randomAnimal').text(randomAnimal());
            $('#confirmSave').modal({      //on modal close reloads page
              backdrop: 'static',
              keyboard: false
            })
            localStorage.lastSync = 0;
        }    // End Success for saveGroup.php
    });

});

$(document).on('click', "button.updateLibraryBtn", function () {
  //Uses a class to call click event

  console.log('Trying to save Comments for group: ' + activeCommentGroup);

  var arrTempComGroup = [];     //  Temp array to hold scrape of page...

  var id;
  var comType;
  var comGroup = activeCommentGroup;
  var groupAuthorID;
  var comAuthorID;
  var userComID;    // ID of Comment in anno_user_comment table
  var userCustomComID;    //ID of row in anno_user_comment_table
  var userComAuthorID;
  var comLabel;
  var comText;
  var comActive;
  var comDefault;
  // var feedActive;
  var comFave;

  $('.annoRow').each(function(i){
    id = $(this).attr('id');
    var parentID = $(this).parent().attr('id');

    if($('#sortCommentsModal').is(':visible') && parentID == 'loadCommentTable'){
      console.log('Parent id is: ' + parentID);   //  loadCommentTable
      // Check if modal is open and, if so, skip the rows on the underlying page
    } else {
      comType = $('#rowType' + id).text();
      console.log('Row type: ' + $('#rowType' + id).text());
      console.log('Counting instances. On: ' + i);
      if ($('#rowType' + id).text() == "userEdited"){
        console.log('Saving user customized for comment ID: ' + id);
        comLabel = $('#custom_comment_label' + id).val();
        comText = $('#custom_comment_text' + id).val();
      } else {    //  User owns the content...
          console.log('Saving user authored for comment ID: ' + id);
          comLabel = $('#comment_label' + id).val();
          comText = $('#comment_text' + id).val();
      }
      comActive = $("#chkComActive" + id).is(':checked') ? 1 : 0;
      comUseCustom = $("#chkUseCustom" + id).is(':checked') ? 1 : 0;
      // feedActive= $("#chkFeedActive" + id).is(':checked') ? 1 : 0;
      comFave = $("#chkFave" + id).is(':checked') ? 1 : 0;

      if (comType == 'newComment'){
        comID = 0;    //  Indicates NEW comment
        comAuthorID = userID;
        groupComID = 0;
        groupAuthorID = userID;
        userComAuthorID = userID;
        userComID = 0;
        userCustomComID = 0;
        userComAuthorID = 0;

      } else {    //  Existing Comment - already has an ID in the db

        arrLibrary = JSON.parse(localStorage.arrLibrary);

        //TODO: check if id = newComment...do something different if so...maybe create new row and get the id back, then drop into the existing process? Which could be elegant...

        console.log('I will look for Comment: ' + id + ' of type: ' + comType); //+ console.log(arrLibrary);

        var obj = arrLibrary.filter(function(obj){
            return obj.comment_id == id;     //  Find object in big library array that matches on comment_id
        })[0];


        if (!obj.group_detail_comment_id) {
          groupComID = 0;
        } else {groupComID = obj.group_detail_comment_id;}

        comID = id;   //  Use simple counter...
        comAuthorID = obj.comment_author_id;
        groupAuthorID = obj.group_author_id;
        userComID = obj.userComID;
        userCustomComID = obj.user_comment_id;
        userComAuthorID = obj.custom_comment_author_id;
        // comActive = $("#chkComActive" + id).is(':checked') ? 1 : 0;
        // comUseCustom = $("#chkUseCustom" + id).is(':checked') ? 1 : 0;
        // // feedActive= $("#chkFeedActive" + id).is(':checked') ? 1 : 0;
        // comFave = $("#chkFave" + id).is(':checked') ? 1 : 0;

        // console.log('I found this comment: ' + obj.comment_label + ' and will replace with ' + comLabel) + console.log(obj);

        // comLabel = $('#customLabel' + id).val();
        // comText = $('customText' + id).val();
      } //  End IF for update (owned or customized)

        // Now, create array regardless of new, customized, or owned...
          arrTempComGroup.push({
            comType: comType,
            userID: userID,
            licType: licType,

            comID: comID,
            comAuthorID: comAuthorID,
            comOrder: i,    //  Use simple counter to 'see' the new order of Comments

            groupID:  comGroup,
            libID:  0,    //  This value isn't used in this process

            groupComID: groupComID,
            groupAuthorID: groupAuthorID,

            userComID: userComID,     //  ID of comment for anno_user_comment table
            userCustomComID: userCustomComID,     //  ID of row in anno_user_comment table
            userComAuthorID: userComAuthorID,
            comLabel: comLabel,
            comText: comText,

            comActive: comActive,
            comUseCustom: comUseCustom,
            // feedActive: feedActive,
            comFave: comFave
          });
        // } else if (comType == 'userOwned'){
      }     //  End ELSE for checking whether modal open
    });  //  End EACH for rowType

    localStorage.removeItem('group_' + comGroup);
    console.log('Remove local group comment array so edit uses new data...');

    console.log('Array I will upload via saveComment.php: ') + console.log(arrTempComGroup);

      $.ajax({
          type: 'post',
          url: baseURL + 'saveComment.php',
          data: JSON.stringify(arrTempComGroup),
          contentType: 'application/json',
          // traditional: true,
          success: function (data) {
              console.log('Was successful in sending data to server...?');
              $('#randomAnimal').text(randomAnimal());
              $('#confirmSave').modal({      //on modal close reloads page
                backdrop: 'static',
                keyboard: false
              })
              localStorage.lastSync = 0;
              // if ($('#loadTable').length){    //  TABLE view...
              // }
              // pullLibrary();
          }
      });
});				//End Update Comments to db

// $(document).on('focusout', "#searchLibraryTB", function () {
// // $("#searchLibraryTB").focusout(function(){
//   console.log('Focusing OUT of search box...');
//   $('#searchLibraryTB').blur();    //  Remove focus
// });

$(document).on('click', "button.sortGroupBtn", function () {
  //Uses a class to update ordering of GRoups

  console.log('Trying to save Group order - for GRoups authored by user.');

  var arrTempGroup = [];     //  Temp array to hold scrape of page...

  var groupID;
  var groupAuthorID = userID;

  $('.groupRow').each(function(i){
    groupID = $(this).attr('id');

    if($(this).hasClass('sortable')){   //  Sortable class only attached if user is author
      console.log('Group owned by user...' + groupID);
      console.log('Counting instances. On: ' + i);
      arrTempGroup.push({
        groupID: groupID,
        userID: userID,
        groupOrder: i
      });
    } else {    //  User owns the content...
      console.log('User is not the author of: ' + groupID);
    }
  });  //  End EACH for Groups

    console.log('Array I will upload via updateGroupOrder.php: ') + console.log(arrTempGroup);

    $.ajax({
        type: 'post',
        url: baseURL + 'updateGroupOrder.php',
        data: JSON.stringify(arrTempGroup),
        contentType: 'application/json',
        // traditional: true,
        success: function (data) {
            console.log('Was successful in sending data to server...?');
            $('#randomAnimal').text(randomAnimal());
            $('#confirmSave').modal({      //on modal close reloads page
              backdrop: 'static',
              keyboard: false
            })
            localStorage.lastSync = 0;
            // if ($('#loadTable').length){    //  TABLE view...
            // }
            // pullLibrary();
        }
    });
});				//End Update Comments to db

// function stripeHandler(email, desc, price){     //  Called from web_background.js
//   console.log('AaAdd Stripe handler init...');
//   var handler = StripeCheckout.configure({
//     // key: 'pk_test_VcHDXYZtL0qJowOjQJXmeqg1',
//     key: 'pk_live_7yveTeglzeb5fnvDYrOmhGEj',
//     image: 'https://www.11trees.com/annotate/images/11trees-Icon-500x500.png  ',
//     locale: 'auto',
//     token: function(token) {
//       console.log('Processed payment with token.id: ' + token.id + ' / ' + token.email);
//       var arrPurchaseDeets = {
//         userID: arrUserData.userID,
//         licType: arrUserData.LicType,
//         tokenID: token.id,
//         UserEmail: token.email,
//         plan: plan,
//         amount: price,
//         selectedLib: selectedLib
//       }
//
//       console.log('Created array with purchase details: ') + console.log(arrPurchaseDeets);
//       // var stringArr = JSON.stringify(arrPurchaseDeets);
//       // console.log('WTF: ' + stringArr);
//
//       sendPurchaseDeets(arrPurchaseDeets);    //  Call AJAX function to send to server/Stripe
//
//     }   //  End TOKEN step for Stripe payment
//   });
//
//   handler.open({
//     name: '11trees.com',
//     email: email,
//     allowRememberMe: false,
//     description: desc,
//     zipCode: true,
//     amount: price
//   });
//   // }   //  End handler for purchase
// }

function updateUserPrefs(arrUserInfo){
  console.log('Updating user prefs in web_background with: ') + console.log(arrUserInfo)
  $.ajax({
    type: 'post',
    url: baseURL + "updateUserDetail.php",
    data: { arrPost: JSON.stringify(arrUserInfo)},
      success: function (msgSuccess) {   // Details on selected libraries
        console.log('Updated your personal info...sender: ' + arrUserInfo.sender);
        if (arrUserInfo.sender === 'updateAllPrefs'){   // Decide whether to show confirmation msg
          $('#flexModalHeader').html('Success!!!');
          $('#flexModalMsg').html("<p>Your personal info and preferences saved successfully.</p><p></p>Please refresh any open pages to make your changes stick.</p>");
          $('#flexModal').modal('show');
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
}     //    END update updateUserPrefs

function processDialogEvent(arg) {
    switch (arg.error) {
        case 12002:
            // console.log("The dialog box has been directed to a page that it cannot find or load, or the URL syntax is invalid.");
            break;
        case 12003:
            // console.log("The dialog box has been directed to a URL with the HTTP protocol. HTTPS is required.");            break;
        case 12006:
            // console.log("Dialog closed.");
            // location.href = 'https://www.11trees.com/annotate/word/beta/enterComment.html';
            location.href = 'enterComment.html';
            break;
        default:
            showNotification("Unknown error in dialog box.");
            break;
    }
}

//  Decodes a string handed through a url. Like: www.google.com/api.html?stringName=42
$.urlParam = function(name){
  var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
  return results[1] || 0;
}

function checkValuesSame(arrInsertName){
  // Array.prototype.allValuesSame = function() {
    //Compares values in a simple array to see if they match
    //  Takes an array (simple: {5,6,7,8}) and returns true/false depending on if there are dupes. Used for checking if insert name is used on only some libraries
      // console.log('Starting allValuesSame with ') + console.log(arrInsertName);

      for(var i = 1; i < arrInsertName.length; i++)
      {
        if(arrInsertName[i].name !== arrInsertName[0].name)
        return false;
      }

      return true;
  // }
}

function checkEditRights(){
  console.log('Checking edit rights of userID: ' + userID);

  //  Editing is a user-specific setting. Creating an account makes you a '1'; only way to turn OFF editing (for TA-like functionality) is through editing the DB directly to place a '0' in the user row.

  //  Elements have addNewPermssion class by default; if a user's userAllowEditing = '1' then we remove it.
  //  Each 'New' click event checks for this class and "returns" out of the event handler if present

  userAllowEditing = localStorage.userAllowEditing;   //  User pref created at login

  if (userAllowEditing == 0){      //TA functionality...hide EDITING
    $('.masterEditPermission button').attr('disabled','disabled');    //Blocks user from ANY editing
  }

  // if (licType == 1){
  //   //TODO: add logic to limit search array and access to comments beyond first 30 from their first (smallest ID) personal library...
  //
  //   //  Freebie user - they can edit the content we created for them automatically
  //   //  OR
  //   //  Using older version of Word, that doesn't support dialogAPI, so we don't give them dialog editing...
  //
  //   // $('.addNewPermission').attr('disabled','disabled');    //Blocks user from ANY editing
  //   // $('.addNewPermission button').addClass('disabled');  //  Blocks user from adding any NEW content
  //   // $('.addNewPermission').click(false);
  //   // $('.addNewPermission').off('click');
  // }

  // if (licType > 1 && userAllowEditing == 1){
  //   $(".addNewPermission").removeClass("addNewPermission");
  // }

  return;
}

function cleanLocalStorage(){
  console.log('Logging user out...');
  if (localStorage.groupsToDelete){
    var arrComGroups = JSON.parse(localStorage.groupsToDelete);    //  Get rid of Groups in local storage
      $.each(arrComGroups, function(i, group){      //  Cycle through each group of Comments
        localStorage.removeItem(group.localStGroupName);
      });
    localStorage.removeItem('groupList');
    localStorage.removeItem('groupsToDelete');
    localStorage.removeItem('lastSync');
    localStorage.removeItem('library');
    localStorage.removeItem('searchArray');
    localStorage.removeItem('OOXML');
    // localStorage.removeItem('library_id');
  } else {console.log('nothing in group list');}
  localStorage.removeItem('licType');
  localStorage.removeItem('userDetails');
  localStorage.removeItem('displayName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userID');
  localStorage.removeItem('clientID');
  localStorage.removeItem('clientName');

  localStorage.removeItem('activeCommentGroup');
  localStorage.removeItem('activeLibrary');
  localStorage.removeItem('activeComment');
  localStorage.removeItem('arrActiveLib');
  localStorage.removeItem('arrAvailableLib');
  localStorage.removeItem('arrAvailableGroup');
  localStorage.removeItem('arrAvailableGroup');
  localStorage.removeItem('arrSelectedLib');
  localStorage.removeItem('arrSelectedGroup');
  localStorage.removeItem('dialogEditSetting');
  localStorage.removeItem('modalChoice');

  localStorage.removeItem('clientAllowSharing');
  localStorage.removeItem('clientShowSupport');
  localStorage.removeItem('userAllowEditing');
  localStorage.removeItem('dialogAPIpresent');

  location.href = 'annotateHome.html';
  signOut();
}

function signOut () {
  firebase.auth().signOut();
}

function dialogAPImodal() {
  $('#flexModalHeader').html('Ruh-roh...');
  $('#flexModalMsg').html("<div class=\"panel panel-default\"><div class=\"panel-body\">It looks like your version of Word 2016 pre-dates March 2016. Many organizations limit the ability of individuals to upgrade Microsoft Office, so you may be stuck with what you've got - which doesn't support some of the convenience features baked into Annotate PRO, like one-click Comment insertion and easy editing inside Word. <p></p>But that's okay. There are workarounds while you work over your IT people to let you update Word to at least a version from the end of 2016!\
  <ul>\
  <li>Use our <a href='https://www.11trees.com/annotate/library/annotateLibrary.html' target='_blank'>web editor</a> for creating, sharing, and licensing new Libraries and Groups</li>\
  <li>Add new Comments via the <b>Edit Active Comments</b> choice in the <b>Edit</b> menu</li>\
  <li>Insert Comments by first creating a Word Comment Bubble the old way, then clicking/searching/choosing a Comment from your Annotate PRO Library</li>\
  </ul>\
  <p></p>Read more about <a href='https://www.11trees.com/live/how-do-i-update-word/'>updating Microsoft Word</a>.</p>");
  $('#flexModal').modal('show');
}

function randomAnimal() {
  arrAnimals = [
    'gerbils',
    'brussels griffons',
    'naked mole rats',
    'dumbo octopii',
    'red pandas',
    'Victoria crowned pidgeons',
    'Japanese spider crabs',
    'glowing sea turtles',
    'angora rabbits',
    'leafy sea dragons',
    'pugmy marmosets',
    'pink fairy armadillos',
    'albino giraffes'
  ]
  return arrAnimals[Math.floor(Math.random() * arrAnimals.length)];
  }

  function recordFeedback(obj, appSource){
    // console.log('FB for ' + userID + ' from ' + appSource + ' with: ') + console.log(obj);

    obj.currentURL	=	'';  // 	Details of Chrome URL - blank for Word 2016
    obj.queryAction = 'createFeedback';		//	So we can create new AND update...
    obj.userID = userID;
    obj.platform = navigator.platform;      // What OS are we using?
    obj.fbSource = appSource;    //  What part of the app sent the feedback? Search? Contextmenu? DD?

    console.log('FB for ' + userID + ' from ' + appSource + ' with: ') + console.log(obj);
  }

  // function sendRecordedFb(obj){   //  Saves feedback to anno_feedback
  //   // obj.userID = userID;   //  Stuff current user into array
  //   console.log('Recording feedback after addition: ') + console.log(obj);
  //
  //   if (obj.user_comment_use_custom == null){
  //     obj.user_comment_use_custom = 0;    //  Can't send null to query...must make 0.
  //   }
  //
  //       $.ajax({
  //         type: 'post',
  //         url: baseURL + 'saveFeedback.php',
  //         // data: JSON.stringify(obj),
  //         data: { obj : JSON.stringify(obj) },
  //         // data: obj,
  //         // contentType: 'application/json',
  //         // traditional: true,
  //         success: function (data) {
  //           console.log('Was successful in sending feedback record to server...');
  //         }
  //       });
  //
  // }

  // function sendComment(arrComment){
  //   $.ajax({
  //       type: 'post',
  //       url: baseURL + 'saveComment.php',
  //       data: JSON.stringify(arrComment),
  //       contentType: 'application/json',
  //       // traditional: true,
  //       success: function (data) {
  //           console.log('Was successful in sending data to server...?');
  //           $('#randomAnimal').text(randomAnimal());
  //           $('#confirmSave').modal({      //on modal close reloads page
  //             backdrop: 'static',
  //             keyboard: false
  //           })
  //           localStorage.lastSync = 0;
  //       }
  //   });
  // }

  function setupTableFormatting(){      //  Formats label/comments, checks for length

    console.log('--------->Setting up table formatting - blur etc...');

    //On focus and blur handlers for length checks for custom label/comment entry

    jQuery(document).on("focusin",".custom_comment_label", function (event) {
      $(this).addClass('highlight-cell');
    });

    jQuery(document).on("blur",".custom_comment_label", function (event) {
      // console.log("Leaving label...");
      $(this).removeClass('highlight-cell');
      var cellText = $(this).val();
      // console.log("Text = " + cellText);
      if (cellText.length>60 || cellText.length === 0){
        $('#flexModalHeader').html('Label is too long OR blank');
        $('#flexModalMsg').html('Your Label is ' + cellText.length + ' characters long. You must include a label; the maximum length allowed is 60 characters (including spaces). Please shorten it to 60 or fewer characters.');
        $('#flexModal').modal('show');
      }
    });

    jQuery(document).on("focusin",".custom_comment_text", function (event) {
      $(this).addClass('highlight-cell');
      $(this).value = '';
    });

    jQuery(document).on("blur",".custom_comment_text", function (event) {
      $(this).removeClass('highlight-cell');
      var cellText = $(this).val();
      if (cellText.length>1500){
        $('#flexModalHeader').html('Label is too long');
        $('#flexModalMsg').html('Your Label is ' + cellText.length + ' characters long. The limit is 1,500 characters (including spaces). Please shorten it to 1,500 or fewer characters. If you\'ve pasted from Microsoft Word or a webpage you may be including lots of HTML characters. Try pasting plain text instead.');
        $('#flexModal').modal('show');
      }
    });

    $('[data-toggle="tooltip"]').tooltip();   //  Initialize Bootstrap tooltips
}     //  END SETUP setupManageAndEdit basics...


function insertText(obj, activeTabId) {

  // console.log("Trying to message and CLOSE popup: " + comment);
  console.log("Language settings: " + FROMLANG + " / " + TOLANG);

  if (TOLANG != "en" || FROMLANG !="en"){

    console.log("Going to translate now...");

    commentObj = {      //  Have to send a little array...
      library_id: 0,
      group_id: 0,
      comment_id: 0,
      user_comment_use_custom: 1
    }

    var comment = obj.currentText;

    $.ajax({
      type: "GET",
      url: "https://www.googleapis.com/language/translate/v2",
      contentType: "application/json; charset=utf-8",
      data: { key: "AIzaSyAyluyxAfxDRockWrnrt9w5gX7rYW3qXgM", source: FROMLANG, target: TOLANG, q: comment },
      dataType: 'json',
      success: function (data) {
        var transText = data.data.translations[0].translatedText;
        console.log(transText);
        transText = transText.replace(/&#39;/g, "'");
        console.log("Translated: " + transText);
        if (DUALRESP === true) {
          commentObj.currentText = comment + '\n \n' + transText;
        }
        else {    //Single language response (translated version)
          commentObj.currentText = transText;
        }
        sendMessage(commentObj);
        },
        error: function (data) {
               console.log('Fail - couldn\'t translate...');
        }
      });
    }
  else {
    console.log('No translation...') + console.log(obj);
    sendMessage(obj, activeTabId);
  }
}

function sendMessage(obj, activeTabId){
  //  why is there a sendMessage here?
  console.log("In send message to tab: " + activeTabId) + console.log(obj);
    chrome.tabs.get(activeTabId, function (tabs){
      var activeURL = tabs.url;
      console.log('Active URL: ' + activeURL);
      chrome.tabs.sendMessage(activeTabId, {method: "insertComment", comment: obj, activeURL: activeURL}, function(response) {
        try {     //  try to add text - if error message user
          if (response.response === 'inserted'){
            window.close();   //Close popup.
            console.log(response.response);
          }
        } catch (err){
          console.log('Page must be refreshed...' + err)
          alert("Annotate PRO was not able to insert text into the page - sorry! \n\nUsually this happens when you\'ve just installed AP but not yet refreshed any open web pages. Or we\'ve updated AP and your open pages have an outdated version.\n\nRefresh any open pages and try again.")
        }
      });
    });
}

function openNewWindow(address, context){

    console.log('OpennewWindow sub...' + address + ' / ' + context);
    //  Local
    // var webAppURL = 'https://localhost/AnnotateX/AnnoWeb/';

    //  Production
    var webAppURL = 'https://www.11trees.com/annotate/library/';

    //  Call crateFB_token.php and get tokenized version for secure handoff
    hashFBUID(FBUID, function (token){
      // console.log('Back from hash PHP call with token: ' + token);
      address = webAppURL + address + '?token=' + token + '&action=' + context;
      chrome.tabs.create({'url': address});

      // window.open(address,'_blank', "toolbar=yes,scrollbars=yes,resizable=yes,top=100,left=100,width=1050,height=700");
    });        // sub to send ID to server to create a hash
}


function hashFBUID(FBUID, callback){
  //  Send to server to create secure parameter to pass to web appear
  console.log('Creating tokenized version of user for secure handoff to web...');

  var url1 = baseURL + 'createFB_token.php';
  var url2 = '&fbUID=' + FBUID;

    $.ajax({
      type: 'POST',
      url: url1,
      data: url2,
      dataType: 'text',
      success: function (token) {
        // console.log('New secure object is: ') + console.log(token);
        callback(token);
      },   //End Success

        error: function (jqXHR, textStatus, errorThrown) {
          console.log('Error: ' + errorThrown + ' / ' + textStatus) + console.log(jqXHR);
          $('#flexModalHeader').html('Can\'t access the 11trees\' servers...');
          $('#flexModalMsg').html("<div class=\"panel panel-default aligncenter\"><div class=\"panel-body\" style=\"background-color: lightgreen\">We\'re sorry...we can\t connect to the 11trees server to check your account. Are you on the internet? <p></p>Here's the error code: " + errorThrown + "</p><p></p><p>Feel free to contact us via our <a href='http://www.11trees.com/live/support'>support pages</a></p>");
          $('#flexModal').modal('show');
        }

  });   //  End ajax
}     //  End hashFBUID sub
