// Object-Relational Mapping(ORM) framework
// responsible for automatically creating and running SQL statements upon
// manipulating our models
const Sequelize = require('sequelize');

// giving sequelize our database credentials so that it can connect to my
// database
const sequelize = new Sequelize('database', 'user', 'password', {
        host: 'host',
        dialect: 'postgres',
        port: 5432,
        dialectOptions: {
                ssl: true
        }
});

// sequelize.define() creates a model, these models directly map to tables and
// rows within our database

// sequelize will automatically create an id, createdAt, updatedAt columns
const People = sequelize.define('People', {
	first_name: Sequelize.STRING,
	last_name: Sequelize.STRING,
	phone: Sequelize.STRING,
	address: Sequelize.STRING,
	city: Sequelize.STRING
}/*, { // if I didn't want the createdAt and updateAt columns
        createdAt: false;
        updatedAt: false;
}*/);

const Car = sequelize.define('Car', {
        // since we specified that vin is the PK, sequelize will no longer
        // automatically create the id field
	vin: {
		type: Sequelize.STRING,
		primaryKey: true,
		unique: true
	},
	make: Sequelize.STRING,
	model: Sequelize.STRING,
	year: Sequelize.STRING,
});

// a car can be owned by many people
// this line adds a Vin column to people which has the Foreign Key constraint
// If a car that was owned by someone was deleted, their Vin will automatically
// take the value of null
Car.hasMany(People, {foreignKey: 'vin'});

const Store = sequelize.define('Store', {
	retailer: Sequelize.STRING,
	phone: Sequelize.STRING,
	address: Sequelize.STRING,
	city: Sequelize.STRING
});

// helper function
// converts every member of an object that has a value of "" to null
// used to avoid repeating code
function empStrToNull(obj) {
        // all properties that were not set by the user will be an
        // empty string ("")
        //
        // these properties must be checked for and replaced with the
        // value null so that when the data is passed to the create
        // function, the null values will indicate "no data" to the
        // database when we insert the new record
        for(const mem in obj)
                if(obj[mem] == "")
                        obj[mem] = null;
}

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
                // extra - ensures we can authenticate with the database
                sequelize.authenticate().then(() => {
                        // syncing is an important operation
                        // it ensures that the models directly map to tables
                        // in the database if we have a difference in our
                        // models compared to the tables in the database,
                        // the database will enforce the new changes upon
                        // synchronizing by either creating a new table
                        // or modifying an existing table
                        sequelize.sync().then(() => {
                                resolve("success");
                        }).catch(err => {
                                reject("unable to sync the database");
                        });
                }).catch(err => {
                        reject("unable to authenticate with the database")
                });
	});
};

// People functions
module.exports.addPeople = function(peopleData) {
	return new Promise((resolve, reject) => {
                empStrToNull(peopleData);

                // the create function accepts an object that specifies fields
                // for the new record
		People.create(peopleData).then(people => {
                        // the callback function for the then() method can
                        // optionally recieve an object corresponding to
                        // the newly inserted object.
                        // This can be used if you want to query the id field
                        // for example
			resolve("success");
		}).catch(err => {
			reject("unable to create the person");
		});
	});
};

// the update() method takes 2 parameters:
// - an object containing all the updated properties
// - an object containing options (ex. the where option)

module.exports.updatePerson = function(person) {

	return new Promise((resolve, reject) => {
                empStrToNull(person);

		People.update(person, {
			where: {
				id: person.id
			}
		}).then(() => {
			resolve("success");
		}).catch(() => {
			reject("unable to update person");
		});
	});
};


// The findAll function accepts a configuration object
// The configuration object could have these options
//
// attributes: [...] - specifies the columns to return (SELECT clause)
// order: [...] - specifies the order (ORDER BY clause)
// where: [...] - conditions to pass to the WHERE clause

module.exports.getAllPeople = function() {
	return new Promise((resolve, reject) => {
		People.findAll().then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.getPeopleByVin = function(vin) {
	return new Promise((resolve, reject) => {
		People.findAll({
			where: {
				vin: vin
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.getPeopleById = function(id) {

	return new Promise((resolve, reject) => {
		People.findAll({
			where: {
				id: id
			}
		}).then(data => {
                        // data is an array, however, since we were
                        // querying by the PK, it will only have one element
                        // or it will be empty (length of zero)
                        // the instructions specify to return the data as an
                        // array
                        resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.deletePeopleById = function(id) {
        return new Promise((resolve, reject) => {
                // The destory() method accepts a single object containing
                // options
                // An example of an option is the where property (Which
                // corressponds to the WHERE clause in SQL)
                People.destroy({
                        where: {
                                id: id
                        }
                }).then(() => {
                        resolve("success");
                }).catch(err => {
                        reject("no results returned");
                });
        })
}


// Car functions
module.exports.addCars = function(car) {
        return new Promise((resolve, reject) => {
                empStrToNull(car)

                Car.create(car).then(car => {
                        resolve("success");
                }).catch(err => {
                        reject("unable to create car");
                });
        });
}

module.exports.updateCar = function(car) {
        return new Promise((resolve, reject) => {
                empStrToNull(car);

                Car.update(car, {
                        where: {
                                vin: car.vin
                        }
                }).then(() => {
                        resolve("success");
                }).catch((err) => {
                        reject("unable to update car")
                });
        });
}

module.exports.getCars = function() {

	return new Promise((resolve, reject) => {
		Car.findAll().then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};


module.exports.getCarsByVin = function(vin) {

	return new Promise((resolve, reject) => {
		Car.findAll({
			where: {
				vin: vin
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.getCarsByMake = function(make) {

	return new Promise((resolve, reject) => {
		Car.findAll({
			where: {
				make: make
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.getCarsByYear = function(year) {

	return new Promise((resolve, reject) => {
		Car.findAll({
			where: {
				year: year
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
};

module.exports.deleteCarByVin = function(vin) {
        return new Promise((resolve, reject) => {
                Car.destroy({
                        where: {
                                vin: vin
                        }
                }).then(() => {
                        resolve("success");
                }).catch(err => {
                        reject("no results returned");
                });
        })
}

// Store functions
module.exports.addStore = function(store) {
        return new Promise((resolve, reject) => {
                empStrToNull(store);

                Store.create(store).then(store => {
                        resolve("success");
                }).catch(err => {
                        reject("unable to create store");
                });

        });
}

module.exports.updateStore = function(store) {
        return new Promise((resolve, reject) => {
                empStrToNull(store);

                Store.update(store, {
                        where: {
                                id: store.id
                        }
                }).then(() => {
                        resolve("success");
                }).catch((err) => {
                        reject("unable to update store")
                });
        })

}

module.exports.getStores = function() {

	return new Promise((resolve, reject) => {
                Store.findAll().then(data => {
                        resolve(data);
                }).catch(err => {
                        reject("no results returned")
                })
	});
};


module.exports.getStoresByRetailer = function(retailer) {

	return new Promise((resolve, reject) => {
		Store.findAll({
			where: {
				retailer: retailer
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});

};


module.exports.getStoreById = function(id) {
	return new Promise((resolve, reject) => {
		Store.findAll({
			where: {
                                id: id
			}
		}).then(data => {
			resolve(data);
		}).catch(err => {
			reject("no results returned");
		});
	});
}

module.exports.deleteStoreById = function(id) {
        return new Promise((resolve, reject) => {
                Store.destroy({
                        where: {
                                id: id
                        }
                }).then(() => {
                        resolve("success");
                }).catch(err => {
                        reject("no results returned");
                });
        })
}
