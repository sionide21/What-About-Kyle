wak = {};
(function() {
	var geocoder = new GClientGeocoder();

	wak.centerMap = function(map, loc, onError) {
	    var updateMap = function(point) {
	   		if (!point) {
				if (onError && typeof(onError) == 'function') {
					onError(loc);
				}
		  	} else {
				map.setCenter(point, 13);
		  	}
	    };
		geocoder.getLatLng(loc, updateMap);
	};
})();