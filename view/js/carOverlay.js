(function() {
	var carIcon = new GIcon(G_DEFAULT_ICON);
	carIcon.image = "http://github.com/sionide21/What-About-Kyle/raw/master/view/icons/car.png";
	 window.CarOverlay = function(point) {
		var my = this;
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
			GEvent.addListener(marker, "dragend", updatePosition);			
		}
		
		function renderInfo() {
			var html = $('#carInfo').html();
			for (var field in data) {
				html = html.replace(new RegExp('#{'+field+'}', 'g'), data[field]);
			}
			// Magic additional stuff
			var pList = '';
			$(data.passengers).each(function(i, val) {
				pList += '<li class="passenger">' + val + '</li>';
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
						my.removeCar();
						updateHandler.deleteCar(my);
					}
				);
			});
			
			$('UL LI.passenger', dom).live('click', function() {
				removePassenger(this);
			});
			
			if (data.passengers && data.passengers.length >= data.numSeats) {
				$('UL LI.input', dom).hide();
			}
			return dom;
		}
		
		function removePassenger(pass) {
			var val = $(pass).text();
			$(pass).remove();
			data.passengers.splice(data.passengers.lastIndexOf(val), 1);
			
			if (data.passengers.length < data.numSeats) {
				$('UL LI.input', formPane).show();
			}
			updateHandler.saveCar(my, true);
		}
		
		function addPassenger(name) {
			if (data.passengers) {
				data.passengers.push(name);
			} else {
				data.passengers = [name];
			}
			$('UL LI.input', formPane).before('<li class="passenger">' + name + '</li>');
			if (data.passengers.length >= data.numSeats) {
				$('UL LI.input', formPane).hide();
			}
			updateHandler.saveCar(my, true);
		}
		
		function showInfoWindow() {
			if (!formPane) {
				formPane = renderInfo();
			}
			marker.openInfoWindowHtml(formPane);
		}
		
		function saveInfo() {
		}	
		
		function updatePosition(ll) {
			data.location = {
				lat: ll.lat(),
				lng: ll.lng()
			};
			updateHandler.saveCar(my, true);
		}	
		
		this.match = function(otherData) {
			return data._id === otherData._id;
		}
		
		this.load = function(json, skipRender) {
			data = json;
			if (!skipRender) {
				formPane = renderInfo();
			}
			if (json.location) {
				var point = new GLatLng(json.location.lat, json.location.lng);
				marker.setLatLng(point);
			}
		}
		
		this.save = function() {
			var ll = marker.getLatLng();
			data.location = {
				lat: ll.lat(),
				lng: ll.lng()
			};
			return data;
		}
		
		this.removeCar = function() {
			map.removeOverlay(marker);
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