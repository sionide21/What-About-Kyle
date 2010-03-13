(function() {
	
	window.WAKDay = function(date) {
		this.cars = [];
		this.date = date;
		
		this.addCar = function(car) {
			car.setDate(this.date);
			this.cars.push(car);
		}
		
		this.render = function(map) {
			$.each(this.cars, function(car) {
				car.place(map);
			});
		}
		
		this.loadCars = function(json) {
			console.log(json);
			$.each(json, function(carJson) {
				var car = wak.loadCar(carJson);
				this.addCar(car);
			});
		}
	}
	
})();