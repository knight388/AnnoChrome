// var FROMLANG;      //Set defaults for translation
// var TOLANG;
// var DUALRESP;     //Should we reply in 2 languages?

$(document).ready(function () {   // document.ready
  "use strict";

  console.log('Passed activeTabId: ') + console.log(activeTabId);

  $('#constructCommentDiv').empty();    //  wipe the modal div in prepartion
  // var myRegexp = /[[\w\d\s,:;!"'@\\\/\.\-#$%^&()\[\]|\<\>\?]+<\/]/ig;

  var originalComment = obj2.currentText;
  var originalLength = originalComment.length;
  console.log('Length of original is: ' + originalLength);

  var inputObj = [];    //  Array to hold input HTML for replace when inserting
  var dynamicObj = [];
  var myRegexp = /(?<=\[\[).+?(?=\]\])/igm;         //  Get content INSIDE the brackets
  // dynamicObj = obj2.currentText.split(myRegexp);
  var match = myRegexp.exec(originalComment);
  console.log('Match is: ' + match);
      while (match !== null) {
        if (match !== '') {
          dynamicObj.push({
            start: match.index,
            end: match.index + match[0].length - 1,
            length: match[0].length - 1,
            text: match[0]
          })
        }
        match = myRegexp.exec(originalComment);
      console.log('Array in construction: ') + console.log(dynamicObj);
    }
    var numberChunks = dynamicObj.length;

  console.log('Split up comment (length): (' + numberChunks + ')') + console.log(dynamicObj);

  //This comment includes [brackets to act as a guide] for inputting text. They are in two places [so we can fully test] logic.

  if (numberChunks > 0){
    //  var res = str.substring(1, 4);
    //  chunk: end, length, start, text
    var charNum = 0;    //  Start character count at zero
    var divHTML;    //  Hold each piece of html to create the overall div
    var constructCommentDiv;  //  string to hold htmlDiv

    divHTML = originalComment.substring(0, dynamicObj[0].start - 2);    // was -1
    console.log('Initial stretch: ' + divHTML);
    if (divHTML !== '[['){   //  Only create if first character is NOT a bracket
      // divHTML = "<span id='firstStretch' contenteditable='true' tabindex='-1'>" + divHTML + "</span>";
      constructCommentDiv = divHTML;
      // $('#constructCommentDiv').append(divHTML);
      charNum = dynamicObj[0].start;
    }
    console.log('Starting loop with charNum: ' + charNum);
    $.each(dynamicObj, function(i, chunk){
      console.log('On chunk: ' + i + ' / ' + charNum);
      if (charNum === chunk.start){   //  bracketed content
        divHTML = chunk.text;
        divHTML = '<input id="chunk' + i + '" class="highlight-cell chunk" placeholder="' + divHTML + '" tabindex="' + i + '" type="text" size="' + (divHTML.length + 5) + '">';
        inputObj.push({
          html: divHTML
        });
        // divHTML = "<span id='chunk" + i + "' contenteditable='true' class='greyText highlight-cell chunk' data-text='" + divHTML + "' tabindex='" + i + "'>" + divHTML + "</span>";
        console.log('Building html (editable): ' + divHTML);
        charNum = chunk.end + 3;    //was 2
        constructCommentDiv = constructCommentDiv + divHTML;
        // $('#constructCommentDiv').append(divHTML);
        console.log('Ending editable chunk w/charNum: ' + charNum);
      } else {
        divHTML = originalComment.substring(charNum, chunk.start - 2);   //Text of Div - was -1
        // divHTML = "<span id='stretch" + i + "' contenteditable='true' tabindex='-1'>" + divHTML + "</span>";
        console.log('Building html (NOT editable): ' + divHTML);
        // charNum = chunk.start;
        constructCommentDiv = constructCommentDiv + divHTML;
        // $('#constructCommentDiv').append(divHTML);
        console.log('Ending read-only stretch w/charNum: ' + charNum);

        //  Now have to build the editable chunk div
        divHTML = chunk.text;
        divHTML = '<input id="chunk' + i + '" class="highlight-cell chunk" placeholder="' + divHTML + '" tabindex="' + i + '" type="text" size="' + (divHTML.length + 5) + '">';
        inputObj.push({
          html: divHTML
        });
        // divHTML = "<span id='chunk" + i + "' contenteditable='true' class='greyText highlight-cell chunk' data-text='" + divHTML + "' tabindex='" + i + "'>" + divHTML + "</span>";
        console.log('Building html (editable): ' + divHTML);
        charNum = chunk.end + 3;    // was 2
        // $('#constructCommentDiv').append(divHTML);
        constructCommentDiv = constructCommentDiv + divHTML;
        console.log('Ending editable chunk w/charNum: ' + charNum);
      }
    });

    if (charNum < originalLength){
      console.log('Have a final stretch of text with length: ' + ' and will start at ' + charNum);
      console.log('Working from original comment: ' + originalComment);
      divHTML = originalComment.substring(charNum);
      console.log('Final stretch: ' + divHTML);
      // divHTML = "<span id='lastStretch' contenteditable='true' tabindex='-1'>" + divHTML + "</span>";
      // $('#constructCommentDiv').append(divHTML);
      constructCommentDiv = constructCommentDiv + divHTML;
    }
  }   //  End Number of chunks counter

  console.log('Finished building HTML: ' + constructCommentDiv);
  $('#constructCommentDiv').html(constructCommentDiv);
  // $('#constructCommentDiv').html(originalComment);
  console.log('Now focus on first yellow option...');
  $('#chunk0').focus();

  $('#closePopupBtn').click(function(updateText){
    console.log('Trying to close...');
    window.close();
  });

  $('#insertCommentPopupBtn').click(function(updateText){

    var emptyChecker = 0;     //  If goes to 1 then the user must enter data

    $('.chunk').each(function(i, obj) {
      var contentz = $('#' + this.id).val();
      console.log('Checking each editable chunk and on chunk: ' + this.id + ' with value ' + contentz);
      if (contentz == ''){
        emptyChecker = emptyChecker + 1;
      }
    });

    if (emptyChecker > 0){
      $('#flexModalHeader').html('Please complete the required text... ');
      $('#flexModalMsg').html('You need to update the text in each yellow text-entry area. Close this popup, complete each yellow area, and click <b>Continue</b>.');
      $('#flexModal').modal('show');
      //TODO: add messaging to user - tooltip on CONTINUE button?
      //TODO: on click of a fave need to get rid of tooltip
    } else {
      // var updatedComment = $('#constructCommentDiv').html();
      var updatedComment = $('#constructCommentDiv').html();
      console.log('html from popup is: ' + updatedComment);
      console.log('Original comment: ' + originalComment);
      console.log('Array still alive?') + console.log(dynamicObj);

      var htmlReplace;    //  string to hold current input HTML so we can replace with plain HTML
      console.log('HTML to replace: ') + console.log(inputObj);
      $.each(dynamicObj, function(i, chunk){
        // var res = str.replace("Microsoft", "W3Schools");
        htmlReplace = inputObj[i].html;
        console.log('Working on i / chunk: ' + i + ' / ' + htmlReplace);
        console.log('Replace with: ' + $('#chunk' + i).val());
        updatedComment = updatedComment.replace(htmlReplace, $('#chunk' + i).val());
      });

      console.log('Updated comment...' + updatedComment);

      obj2.currentText = updatedComment;
      obj2.user_comment_use_custom = 1;
      insertText(obj2, activeTabId);
      chrome.runtime.sendMessage({ msg: "saveFeedback", obj: obj2, source: context});
    }
  });



});   //  End documentready
