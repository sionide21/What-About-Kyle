(function() {
	var carIcon = new GIcon(G_DEFAULT_ICON);
	carIcon.image = "http://github.com/sionide21/What-About-Kyle/raw/master/view/icons/car.png";
	 window.CarOverlay = function(point) {
		var marker;
		function init() {
			marker = new GMarker(point, {
				draggable: true,
				icon: carIcon
			});
			GEvent.addListener(marker, "click", showInfoWindow);
		}
		
		function showInfoWindow() {
			marker.openInfoWindowHtml($('#carInfo').html());
		}	
		
		this.place = function(map) {
			map.addOverlay(marker);
		}
		
		init();
	}
})();