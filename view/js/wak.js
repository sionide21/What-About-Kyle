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
     *    location: {lat: '', lng: ''}
     * }
	 */
	wak.loadCar = function(json) {
		var point = new GLatLng(json.location.lat, json.location.lng);
		var car = new CarOverlay(point);
		car.load(json);
		return car;
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