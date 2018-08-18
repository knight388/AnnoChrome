var recipID;
var FBUID;        //  Hold Firebase uid for SSO handoff to web app
var currentPg = 0;

$(document).ready(function () {   // document.ready
  "use strict";

  // console.log('Passed html: ') + console.log(arrRecipHistory);

  $('#recipNameSpan').text(recipName);

  // if ($('#searchLibraryTB').length){      //Are we showing top toolbar?
  console.log('Show top toolbar with history...licType: ' + localStorage.licType);

  setupHistoryWindow1(arrRecipHistory);

  $('#closePopupBtn').click(function(){
    console.log('Trying to close...');
    window.close();
  });

  $('.accountPage').click(function(){
    var address = 'annotateLibrary.html';
    var context = 'account';
    openNewWindow(address, context);
  });

});   //  End documentready

function setupHistoryWindow1(arrRecipHistory){


  $('#feedbackHistoryTableBody').empty();

  var maxHistory;
  if (localStorage.licType === "1"){
    maxHistory = 5;
  } else {
    maxHistory = arrRecipHistory.length;
  }

  var i;

  var clickLink;

  var totalPages = Math.ceil(totalRows / 50);
  //  math.ceil returns integer closest to value

  for (i = 0; i < totalPages; i++) {
    if (currentPg != i + 1){
      $('<span class="pageNumber">&nbsp;' + (i + 1) + '</span>').appendTo(feedPagesSpan);
    } else {    //  Bold the current page
      $('<span class="pageNumber"><b>&nbsp;' + (i + 1) + '</b></span>').appendTo(feedPagesSpan);
    }
  }

  $('.pageNumber').hover(
    function() {
      $(this).addClass('focusPagination');
    },
    function() {
      $(this).removeClass('focusPagination');
    }
  );

  $('.pageNumber').click(function(clickPagination){
    var pageOffset = $(this).text();
    currentPg = pageOffset;   //  Store for bolding chosen page
    pageOffset = (currentPg - 1) * 50;     //  50 per page
    $('#feedPagesSpan').empty();
    console.log('Clicked: ' + pageOffset);
    // $('#feedbackHistoryTableBody').empty();   //  Clear out table
    getFeedback('recipDetails', userID, recipID, pageOffset,'1','','',setupHistoryWindow1);
  });

  $.each(arrRecipHistory,function(i,comment){
    console.log('Zooming throuhgh history. On: ' + i + ' max allowed: ' + maxHistory);
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
          <td colspan='2' class='aligncenter'><a class='btn btn-primary accountPage' data-toggle='tooltip' data-placement='bottom' title='License AP to get a full history of feedback to your students...' tabindex='-1'>License AP for just $24/year to get a full history of feedback...</a></td>\
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

}
