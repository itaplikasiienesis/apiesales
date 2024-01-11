module.exports.route = {
    "GET /master/leadtime": "master/LeadTimeController.find",
    "GET /master/leadtime/:id": "master/LeadTimeController.findOne",
    "POST /master/leadtime": "master/LeadTimeController.new",
    "PUT /master/leadtime": "master/LeadTimeController.update",
    "DELETE /master/leadtime/:id": "master/LeadTimeController.delete",
};