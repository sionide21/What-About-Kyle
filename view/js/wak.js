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
	
	/**
	 * {
	 *    date: '',
     *    driver: '',
     *    passenger: [],
     *    numSeats: num,
     *    dest: '',
     *    pointOnMap: {lat: '', lng: ''}
     * }
	 */
	wak.loadCar = function(json) {
		var point = new GLatLng(json.pointOnMap.lat, json.pointOnMap.lat);
		var car = new CarOverlay(json.pointOnMap);
		car.load(json);
	};
	
	wak.jsonizeForm = function (form) {
		var ret = {};
		$('INPUT', form).each(function() {
			if (this.type == 'text') {
				ret[this.name] = this.value;
			}
		});
		return ret;
	};
})();