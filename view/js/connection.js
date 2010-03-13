function Connection(url, group) {
	var appendStr = '?jsoncallback=?';
	
	function conn(path) {
		return url + path + appendStr;
	}

	this.loadDay = function(date, callback) {
		var params = {
			group: group
		};
		
		if (date) {
			params.date = date;
		}
	
		$.getJSON(
			conn('/getCars'),
			params,
			function(data) {
				var a = new WAKDay(new Date());
				a.loadCars(data);
				callback(a);
			}
		);
	};
	
	this.addCar = function(car) {
		var params = car.save();
		params.group = group;
		$.getJSON(conn('/addCar'), 
			{car: JSON.stringify(params)},
		   function(data){
		   		car.load(data);
		   });
	};	
	
	this.saveCar = function(car, skipRender) {
		var params = car.save();
		params.group = group;
		$.getJSON(conn('/modifyCar'), 
			{car: JSON.stringify(params)},
		   function(data){
		   		car.load(data, skipRender);
		   });
	};
};