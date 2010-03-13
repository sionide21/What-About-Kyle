function Connection(url, group) {
	var conn = url + '?jsoncallback=?';

	this.loadDay = function(date, callback) {
		var params = {
			group: group
		};
		
		if (date) {
			params.date = date;
		}
	
		$.getJSON(
			conn,
			params,
			function(data) {
				var a = new WAKDay(new Date());
				a.loadCars(data);
				callback(a);
			}
		);
	}
};