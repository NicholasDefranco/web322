//the route used in this question
app.get("/people", (req,res)=>{
    if (req.query.city){

        ds.getPeopleByCity(req.query.city).then((people)=>{
            res.render("people", {data: people});
        });
    }
    else{
        //ds is the data-service object with the exported method below.
        ds.getAllPeople().then((people)=>{
            res.render("people", {data: people});
        });
    }
});


//from the data-service module:
module.exports.getAllPeople = function(){
        return new Promise((resolve,reject)=>{
            People.find({},"first_name")
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