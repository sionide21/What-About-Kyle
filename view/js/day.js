(function() {
	
	window.WAKDay = function(date) {
		my = this;
		this.cars = [];
		this.date = date;
		
		this.addCar = function(car) {
			car.setDate(my.date);
			my.cars.push(car);
		}
		
		this.render = function(map) {
			$.each(my.cars, function() {
				this.place(map);
			});
		}
		
		this.loadCars = function(json) {
			$.each(json, function() {
				var car = wak.loadCar(this);
				my.addCar(car);
			});
		}
	}
	
})();