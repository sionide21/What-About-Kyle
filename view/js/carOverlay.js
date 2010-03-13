(function() {
	var carIcon = new GIcon(G_DEFAULT_ICON);
	carIcon.image = "http://github.com/sionide21/What-About-Kyle/raw/master/view/icons/car.png";
	 window.CarOverlay = function(point) {
		var marker;
		var data = {};
		var map;
		var formPane = false;
		
		function init() {
			marker = new GMarker(point, {
				draggable: true,
				icon: carIcon
			});
			GEvent.addListener(marker, "click", showInfoWindow);
			GEvent.addListener(marker, "infowindowclose", saveInfo);
			
		}
		
		function renderInfo() {
			var html = $('#carInfo').html();
			for (var field in data) {
				html = html.replace(new RegExp('#{'+field+'}', 'g'), data[field]);
			}
			// Magic additional stuff
			var pList = '';
			$(data.passengers).each(function(i, val) {
				pList += '<li>' + val + '</li>';
			});
			html = html.replace(/#{passengerList}/i, pList);
			
			var dom = $('<div>' + html + '</div>')[0];
			$('FORM.addPassengerBox', dom).submit(function() {
				addPassenger($('FORM.addPassengerBox INPUT.addPassengerBox', dom).val());
				$('FORM.addPassengerBox INPUT.addPassengerBox',dom).val('');
				return false;
			});
			
			$('.deleteButton', dom).click(function() {
				msgBox.prompt(
					'Are you sure you want to delete this car?', 
					function() {
						map.removeOverlay(marker);
					}
				);
			});
			
			return dom;
		}
		
		function addPassenger(name) {
			if (data.passengers) {
				data.passengers.push(name);
			} else {
				data.passengers = [name];
			}
			$('UL LI.input', formPane).before('<li>' + name + '</li>');
		}
		
		function showInfoWindow() {
			if (!formPane) {
				formPane = renderInfo();
			}
			marker.openInfoWindowHtml(formPane);
		}
		
		function saveInfo() {
		}	
		
		this.load = function(json) {
			data = json;
			formPane = renderInfo();
		}
		
		this.save = function() {
			var ll = marker.getLatLng();
			data.location = {
				lat: ll.lat(),
				lng: ll.lng()
			};
			return data;
		}
		
		this.place = function(m) {
			map = m;
			map.addOverlay(marker);
		}
		
		this.setDate = function(date) {
			data.date = date.toUTCString();
		}
		
		init();
	}
})();