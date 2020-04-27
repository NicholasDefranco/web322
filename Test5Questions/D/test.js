//the people route
app.get("/people", (req,res)=>{
    if (req.query.city){
        //ds is a object from my data-service.js with the exported module
        ds.getPeopleByCity(req.query.city).then((people)=>{
            res.render("people", {data: people});
        });
    }
    else
    res.render("people", {data: people});
});



//from the data-service module
module.exports.getPeopleByCity = function(inCity){
        return new Promise((resolve,reject)=>{
            People.findOne({ city: inCity})
            .exec()
            .then((people) => {
            if (people.length > 0){
                resolve(people);
            }
            else {
                reject({message: "No People"});
                return;
            }
            }).catch(()=>{
                reject({message: "Error getting People"})
            }); 
        });
    }