function Connection(url, group) {
	var appendStr = '?jsoncallback=?';
	
	function conn(path) {
		return url + path + appendStr;
	}

	this.loadDay = function(date, callback) {
		var params = {
			group: group,
			date: date
		};
	
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
	
	this.deleteCar = function(car) {
		var params = car.save();
		params.group = group;
		$.getJSON(conn('/deleteCar'), 
			{car: JSON.stringify(params)},
		   $.noop);
	};
	
	function listen(params, callback) {
		$.ajax({
		  url: conn('/listen'),
		  cache: false,
		  dataType: 'jsonp',
		  data: params,
		  success: callback,
		  error: function (r, status) {
		  	if (status === 'timeout') {
		  		listen(params, callback);
		  	}
		  }
		});
	}
	
	this.registerListener = function(date, listenerObject) {
		var params = {
			group: group,
			date: date
		};
		
		var callback = function(data) {
			if (typeof(listenerObject[data.status]) === 'function') {
				listenerObject[data.status](data.car);
		  		listen(params, callback);
			}
		}
		
		listen(params, callback);
		
	};
};