module.exports.route = {
    "POST /oee/submit": "transactions/oee/OeeController.submit",
    "GET /oee": "transactions/oee/OeeController.find",
    "GET /oee/:id": "transactions/oee/OeeController.findone",
    "GET /oee/bigloses": "transactions/oee/OeeController.findAllBigLoses",
    "GET /oee/bigloses/:id": "transactions/oee/OeeController.findbiglosesbyid",
    "POST /oee/delete": "transactions/oee/OeeController.delete",
    "POST /oee/upsert": "transactions/oee/OeeController.upsert",
    "GET /oee/reset/:id": "transactions/oee/OeeController.reset",
};