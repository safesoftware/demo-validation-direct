//Do this as soon as the DOM is ready
$(document).ready(function() {

  var config = {
    server: "https://bluesky-safe-software.fmecloud.com",
    token: "66da6d2b1f4b4681451a8f9043ad653a756fdb03"
  };
  
  $('#loadingImage').hide();
  
  initialize(config);
	
});

var initialize = function (config) {
	FMEServer.init(config);
  
  BuildForm.token = config.token;
  BuildForm.host = config.server;
	
	//Call server and get the session ID and path
	FMEServer.getSession(BuildForm.repository, BuildForm.workspaceName, function(json){
		BuildForm.session = json.serviceResponse.session;
		BuildForm.path = json.serviceResponse.files.folder[0].path;
		
		//Call server to get list of parameters and potential values
		FMEServer.getWorkspaceParameters(BuildForm.repository, BuildForm.workspaceName, BuildForm.buildParams);

		//Build up the form
		BuildForm.init();

	});
  
};


var BuildForm = {
	repository : 'DaleCADDemo',
	workspaceName : 'validate.fmw',
	session : null,
	path : null,

	init : function() {

		//hide navigation buttons
		$('#back').hide();


		$('#back').click(function(){
			if (! $('#submissionPage').hasClass('active')){
				$('#back').hide();
				//clear the results page
				$('#resultStatus').remove();
				$('#loadingImage').show();
			}
		})

		//--------------------------------------------------------------
		//Initialize the drag and drop file upload area
		//--------------------------------------------------------------
		//control behaviour of the fileuploader
		$('#fileupload').fileupload({
			url : BuildForm.host + '/fmedataupload/' + BuildForm.repository + '/' +  BuildForm.workspaceName + ';jsessionid=' + BuildForm.session,
			dropzone : $('#dropzone'),
			autoUpload : true,

			//when a new file is added either through drag and drop or 
			//file selection dialog
			add : function(e, data){
				//displays filename and progress bar for any uploading files
				$('#fileTable').show();
				data.context = $('#fileTable');
				$.each(data.files, function(index, file) {
					if (!index) {
						var elemName = file.name;
						elemName = elemName.replace(/[.\(\)]/g,'');
						elemName = elemName.split(' ').join('');

						var row = $("<div id='row"+ elemName + "' class='fileRow'/>");

						var name = $("<div class='fileName'>" + file.name + '</div>');
						var progressBar = $("<div id='progress" + elemName + "' class='progress progress-success progress-striped' />");
						progressBar.append("<div class='bar' />");
						var progress = $("<div class='progressBar' id='" + elemName +"'/>").append(progressBar);
					}

					name.appendTo(row);
					progress.appendTo(row);
				 	row.appendTo(data.context);
          $('#dropText').hide();
          $('.fileinput-button').hide();
				})

				data.submit();
			},

			done : function(e, data){
				//update list of uploaded files with button to select 
				//them as source datasets for translation
				var elemName = data.files[0].name;
				elemName = elemName.replace(/[.\(\)]/g, '');
				elemName = elemName.split(' ').join('');

				var test = 'stop';
        BuildForm.submit();
			}, 

			fail : function(e, data) {
				$.each(data.result.files, function(index, file) {
					var error = $('<span/>').text(file.error);
					$(data.context.children()[index])
						.append('<br>')
						.append(error);
				});
			},

	        dragover : function(e, data){
	      		//going to use this to change look of 'dropzone'
	      		//when someone drags a file onto the page
				var dropZone = $('#dropzone');
				var timeout = window.dropZoneTimeout;

				if (!timeout){
					dropZone.addClass('in');
				}
				else{
					clearTimeout(timeout);
				}

				var found = false;
				var node = e.target;
				do {
					if (node == dropZone[0]){
						found = true;
						break;
					}
					node = node.parentNode;
				}
				while (node != null);
				if (found){

					dropZone.addClass('hover');
				}
				else {

					dropZone.removeClass('hover');
				}
				window.dropZoneTimeout = setTimeout(function(){
					window.dropZoneTimeout = null;

					dropZone.removeClass('in hover');
				}, 100);
			},

			//give updates on upload progress of each file
			progress : function(e, data){
				var progress = parseInt(data.loaded / data.total * 100, 10);

				var name = data.files[0].name
				name = name.replace(/[.\(\)]/g, '');
				name = name.split(' ').join('');

				var progressId = '#progress' + name + ' .bar';
				$(progressId).css('width', progress + '%');

			}
		});
	},

	submit : function() {
    
    var files = '"'; 
		var fileList = $('.fileRow');

		//check a file has been uploaded and at least one is selected
		if (fileList.length == 0){
			//put out an alert and don't continue with submission
			$('#dropzone').prepend('<div class="alert alert-error"> Please upload a file. <button type="button" class="close" data-dismiss="alert">&times;</button></div>');
		}

		else{
				$('#loadingImage').fadeIn();

				for (var i = 0; i < fileList.length; i++){
          files = files + '"' + BuildForm.path + '/' + fileList[i].firstChild.textContent + '" ';
				}

				files = files + '"';

				//build url
				var submitUrl = BuildForm.host + '/fmedatastreaming/' + BuildForm.repository + '/' +  BuildForm.workspaceName + '?SourceDataset_ACAD=' + files;
        submitUrl += '&token='+BuildForm.token;
        submitUrl += '&opt_responseformat=json';

				//submit
				$.ajax(submitUrl)
					.done(function(result){					
						 BuildForm.displayResults(result, true);
					})
					.fail(function(textStatus){
						var error = textStatus;
					});

		}
	},

	displayResults : function(result, isSuccess){
		//hide loading image
		$('#loadingImage').hide();
    
    //hide upload area
    $('#dropzone').hide();
    $('#submitToServer').hide();

		//show back button
		$('#back').show();

		//get the JSON response from the Server and displays information on the page
		var resultStatus = $('<div id="resultStatus" />');

		if (isSuccess){;

			resultStatus.append(result);
		}
		else{
			var FMEError = result.responseJSON.serviceResponse.fmeTransformationResult.fmeEngineResponse.statusMessage;
			resultStatus.append("<h3>There was an error submitting your request</h3>");
			resultStatus.append('<br/>');
			resultStatus.append('<p class="errorMsg">Error ' + result.status + ': ' + result.statusText + '</p>');
			if (FMEError == "Translation Successful"){
				resultStatus.append('<p class="errorMsg">No features were read from the source dataset</p>');
			}
			else{
				resultStatus.append('<p class="errorMsg" >' + FMEError + '</p>');
			}
			resultStatus.append('<br/>');
			resultStatus.append('<p class="errorNote">Use the back arrow to return to the start page.</p>');
		}

		$('#results').append(resultStatus);
	},

	buildParams : function(json){
		//parse JSON response
		//add in drop down menu options from workspace
		var paramArray = json;
		var elements = [ 'SourceFormat', 'DestinationFormat' ];
		for (var i = 0; i < paramArray.length; i++){
			//populate drop-down options for choice-type parameters
			if (elements.indexOf(paramArray[i].name) != -1){
				//populate drop-down options on page
				if(paramArray[i].listOptions){
					var optionArray = paramArray[i].listOptions;
					for (var x = 0; x < optionArray.length; x++){
						if (optionArray[x].value != 'SDF3' && optionArray[x].value != 'SQLITE3FDO'){
							var option = $('<option />', {value: optionArray[x].value, text: optionArray[x].caption});
							$('#' + paramArray[i].name).append(option);
						}
					}
				}
			}
		}
	}

}