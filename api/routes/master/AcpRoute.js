module.exports.route = {
    "GET /master/acp": "master/AcpController.find",
    "GET /master/acp/:id": "master/AcpController.findOne",
    "POST /master/acp": "master/AcpController.new",
    "PUT /master/acp": "master/AcpController.update",
    "DELETE /master/acp/:id": "master/AcpController.delete",
};