// Add Dialog
function initAddDialog(map) {
	
	var addDialog = new YAHOO.widget.Dialog("addDialog", { 
		width: "24em",
	  	fixedcenter: true,
	  	visible: false, 
	  	constraintoviewport: true,
	  	buttons: [ 
	  		{ 
	  			text: "Add", 
	  			handler: addCarCallback, 
	  			isDefault: true
	  		}
	  	]
	});

	function addCarCallback() {
		var listener = GEvent.addListener(map, "click", function(overlay, point) {
			if (!overlay) {
				var car = new CarOverlay(point);
				car.place(map);
				car.load(wak.jsonizeForm($('FORM#addCarForm')));
				GEvent.removeListener(listener);
				msgBox.clear();
			}
		});
		msgBox.show('Click on the map to place your new car.');
		addDialog.hide();
		return false;
	}
							
	addDialog.render();
		
	$('button#addCar').click(function() {
		addDialog.show();
	});
};

// Message Box
msgBox = {};

// Confirm Dialog
(function () {
	var yesBack = false;
	var noBack = false;
	
	
	var yes = function() {
		this.hide();
		if (yesBack && typeof(yesBack) === 'function') {
			yesBack();
		}
	}
	
	var no = function() {
		this.hide();
		if (noBack && typeof(noBack) === 'function') {
			noBack();
		}
	}
	
	var dialog;
	
	$(function() {
		dialog = new YAHOO.widget.SimpleDialog("promptDialog", { 
			width: "300px",
			fixedcenter: true,
			visible: false,
			draggable: false,
			close: true,
			text: "Do you want to continue?",
			icon: YAHOO.widget.SimpleDialog.ICON_HELP,
			constraintoviewport: true,

			buttons: [ 
				{ 
					text: "Yes",
					handler: yes
				}, { 
					text: "No",
					handler: no,
					isDefault: true
				}
			]
		});
		dialog.render();
	});
	
	msgBox.prompt = function(msg, yesCallback, noCallback) {
		yesBack = yesCallback;
		noBack = noCallback;
		dialog.setBody(msg);
		dialog.show();
	};
	
})();

(function() {
	var box;
	$(function() {
		box = $('#messageArea');
	});
	
	msgBox.show = function(str) {
		box.text(str);
		var len = str.length/2;
		box.css('margin-left', '-' + len + 'em');
		box.slideDown('fast');
	};
	
	msgBox.clear = function() {
		box.text('');
		box.slideUp('fast');
	};
})();