// one-way password encryption library
const bcrypt = require("bcryptjs");

// ODM
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
        // User names are unique
        "userName" : {
                type: String,
                unique: true
        },
        "password" : String,
        "email" : String,
        // for every login, a new entry is added to this array
        "loginHistory" : [
                {
                        "dateTime" : Date,
                        "userAgent" : String
                }
        ]
});

// to hold a model of the userSchema
let User;

module.exports.initialize = function() {
        return new Promise((resolve, reject) => {
                // A call to encodeURIComponent() is important if the
                // password contains special characters
                let pass = encodeURIComponent("pwd");
                // createConnection() returns a reference to the connection
                let db = mongoose.createConnection(`connection string`, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

                // if the connection was successful, this callback will run
                db.once('open', () => {
                        // registering the userSchema as a model to connect
                        // to the users collection in the database
                        User = db.model("users", userSchema);
                        resolve();
                });

                // if the connection was unsuccessful, this callback will run
                db.on('error', (err) => {
                        reject(err);
                });
        });
}

module.exports.registerUser = function(userData) {
        return new Promise((resolve, reject) => {
                // check if the password properties match each other
                if(userData.password !== userData.password2) {
                        reject("Passwords do not match");
                } else {
                        // generate a salt with 10 rounds
                        // The genSalt() function (if successful) resolves to the salt generated
                        bcrypt.genSalt(10).then((salt) => {
                                // the password is hashed and salted
                                // the salt recieved from the previous
                                // resolved promise is passed to the hash()
                                // function
                                bcrypt.hash(userData.password, salt).then((hash) => {
                                        // set the newly created hashed
                                        // password to the password
                                        // property to be used to create
                                        // a new User
                                        userData.password = hash;

                                        // Create a new User to be a document
                                        // in our database using the
                                        // reference to User (our model)
                                        let newUser = new User(userData);

                                        // save() is invoked on the newly
                                        // created document.
                                        //
                                        // save() can optionally recieve a
                                        // second parameter which contains
                                        // the document just saved to the
                                        // collection
                                        newUser.save((err, data) => {
                                                if(err) {
                                                        // duplicate key
                                                        if(err.code == 11000) {
                                                                reject("User Name already taken");
                                                        } else {
                                                                reject("There was an error creating the user: " + err);
                                                        }
                                                } else {
                                                        resolve();
                                                }
                                        });
                                }).catch(err => {
                                        reject("There was an error encrypting the password")
                                });
                        }).catch(err => {
                                reject("There was an error encrypting the password")
                        });
                }
        });
}

module.exports.checkUser = function(userData) {
        return new Promise((resolve, reject) => {
                // NOTE: The .exec() call ensures object returned from the
                // query is a proper Promise.
                User.find({
                        userName: userData.userName
                }).exec().then(users => {
                        // check if there was a match
                        if(users.length === 0) {
                                reject("Unable to find user: " + userData.userName);
                        } else {
                                // compare the parameter's password (inputed)
                                // password is the same as the password
                                // stored in the database
                                bcrypt.compare(userData.password,
                                                users[0].password).then(result => {

                                        // result is a boolean specifying
                                        // a match or not
                                        if(!result) {
                                                reject("Incorrect Password for user: " + userData.userName);
                                        } else {
                                                // updating the login history
                                                // of the user
                                                users[0].loginHistory.push({
                                                        dateTime: new Date().toString(),
                                                        userAgent: userData.userAgent
                                                });

                                                // updateOne takes 2
                                                // arguments: a query to
                                                // specify the documents to
                                                // update and fields to be
                                                // set (with their new value)
                                                User.updateOne({
                                                        // we can search by
                                                        // user name as it's
                                                        // unique
                                                        userName: users[0].userName
                                                }, {
                                                        $set: {
                                                                loginHistory: users[0].loginHistory
                                                        }
                                                }).exec().then(() => {
                                                        // deleting the
                                                        // password is
                                                        // important for
                                                        // security
                                                        delete users[0].password;
                                                        resolve(users[0]);
                                                }).catch(err => {
                                                        reject("There was an error verifying the user: " + err);
                                                });
                                        }
                                }).catch(err => {
                                        reject("There was an error when comparing passwords");
                                });

                        }
                }).catch(err => {
                        reject("Unable to find user: " + userData.userName);
                });
        });
}
