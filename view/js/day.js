(function() {
	
	window.WAKDay = function(date) {
		my = this;
		this.cars = [];
		this.date = date;
		var map = false;
		
		
		this.addCar = function(car) {
			car.setDate(my.date);
			my.cars.push(car);
		}
		
		this.render = function(m) {
			map = m;
			$.each(my.cars, function() {
				this.place(map);
			});
		}
		
		this.hide = function() {
			$.each(my.cars, function() {
				map.removeOverlay(this);
			});
			map = false;
		}
		
		this.loadCars = function(json) {
			$.each(json, function() {
				var car = wak.loadCar(this);
				my.addCar(car);
			});
		}
		
		this.listenForUpdates = function(conn) {
			var listeners = {
				addCar: carAdded,
				modifyCar: carModified,
				deleteCar: carDeleted
			}
			conn.registerListener(my.date, listeners);
		}
		
		function carDeleted(json) {
			
		}
		
		function carAdded(json) {
			var car = wak.loadCar(json);
			my.addCar(car);
			if (map) {
				car.place(map);
			}
		}
		
		function carModified(json) {
			
		}
	}
	
})();