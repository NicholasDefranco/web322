// used for reading and writing to files within a filesystem
const fs = require("fs");

// path module is required for working for path names (required for when we
// send files in a get request)
const path = require("path");

// arrays declared in the global scope, but still local to the module
let cars = [];
let people = [];
let stores = [];

// Notes:
// code that normally runs asynchronously can be placed inside a container
// function which is passed to a promise object. We do this if we want the
// code to execute in a specific order.
//
// code in the container function may be successful or it may fail.
// if the code works, the resolve() method is called, we can subsequently
// execute any code that depended on the previous code to work (we pass
// the next function to the .then() method which we invoke on the returned
// promise object that has "resolved")
//
// if the code fails, the reject() method is called. we can handle the
// error by passing a function to the .catch() method which we invoke on the
// returned promise object that has been put in a "rejected" state.

module.exports.initialize = function() {
	return new Promise((resolve, reject) => {
		fs.readFile(path.join(__dirname, "./data/people.json"),
						'utf8', (err, data) => {
			if(err) {
				// calling reject() (or even resolve()) will
				// not return from the container function.
				//
				// it will just put the promise in a
				// rejected state making the
				// following return statement necessary
				reject("unable to read file");
				return;
			}

			// JSON.parse() parses json data into javascript
			// object(s)
			people = JSON.parse(data);
			fs.readFile(path.join(__dirname, "./data/cars.json"),
						'utf8', (err, data) => {

				if(err) {
					reject("unable to read file");
					return;
				}

				cars = JSON.parse(data);
				fs.readFile(path.join(__dirname,
						"./data/stores.json"),'utf8',
							(err, data) => {
					if(err) {
						reject("unable to read file");
						return;
					}

					stores = JSON.parse(data);

					// success
					resolve();
				});
			});
		});
	});
};

// accessor functions, returns one of the arrays that are local to the module
// assuming that the array is not empty, if it is, the promise will
// be placed in a rejected state

module.exports.addPeople = function(peopleData) {
	return new Promise((resolve, reject) => {
		peopleData.id = people.length + 1;
		people.push(peopleData);
		resolve();
	});
};

// extra helper function that was used in the /pictures route to obtain the
// contents of the uploaded directory (image files stored within that
// directory)
module.exports.getPictures = function() {
	return new Promise((resolve, reject) => {
		fs.readdir(path.join(__dirname,
				"./public/pictures/uploaded"), 'utf8',
							(err, data) => {
			// if the err object is not empty(not undefined),
			// the directory could not be read which is a server
			// side error
			if(err) {
				err.name = "readdir";
				reject("Oops looks like there is an " +
						"error on our side");
			} else if(data.length === 0) {
				reject("Sorry no pictures available");
			} else {
				resolve(data);
			}
		});
	});
};

module.exports.getAllPeople = function() {
	return new Promise((resolve, reject) => {
		if(people.length === 0) {
			reject("No people available");
			return;
		}

		resolve(people);
	});
};

module.exports.getCars = function() {

	return new Promise((resolve, reject) => {
		if(cars.length === 0) {
			reject("No cars available");
			return;
		}

		resolve(cars);
	});
};

module.exports.getStores = function() {

	return new Promise((resolve, reject) => {
		if(stores.length === 0) {
			reject("No stores available");
			return;
		}

		resolve(stores);
	});
};

module.exports.getPeopleByVin = function(vin) {
	return new Promise((resolve, reject) => {
		const result = people.filter(e => e.vin == vin);

		if(result.length === 0)
			reject("No person owns a car with this vin");
		else
			resolve(result);
	});
};

module.exports.getPeopleById = function(id) {

	return new Promise((resolve, reject) => {
		const found = people.find(e => e.id == id);

		if(found)
			resolve(found);
		else
			reject("No such person");

	});
};

module.exports.getCarsByVin = function(vin) {

	return new Promise((resolve, reject) => {
		const result = cars.filter(e => e.vin == vin);

		if(result.length === 0)
			reject("No cars match the chosen vin");
		else
			resolve(result);
	});
};

module.exports.getCarsByMake = function(make) {

	return new Promise((resolve, reject) => {
		const result = cars.filter(e => e.make === make);

		if(result.length === 0)
			reject("No cars match the chosen make");
		else
			resolve(result);
	});
};

module.exports.getCarsByYear = function(year) {

	return new Promise((resolve, reject) => {
		const result = cars.filter(e => e.year == year);

		if(result.length === 0)
			reject("No cars match the chosen year");
		else
			resolve(result);
	});
};

module.exports.getStoresByRetailer = function(retailer) {

	return new Promise((resolve, reject) => {
		const result = stores.filter(e => e.retailer == retailer);

		if(result.length === 0)
			reject("No stores match the chosen retailer");
		else
			resolve(result);
	});

};

module.exports.updatePerson = function(person) {

	return new Promise((resolve, reject) => {
		const i = people.findIndex(e => e.id == person.id);

		// findIndex returns -1 upon failure
		if(i >= 0) {
			people[i] = person;
			resolve();
		} else {
			reject("No such person");
		}
	});
};
