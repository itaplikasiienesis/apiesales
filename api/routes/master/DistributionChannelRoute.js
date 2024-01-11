module.exports.route = {
    "GET /master/channel": "master/DistributionChannelController.find",
    "GET /master/channel/:id": "master/DistributionChannelController.findOne",
    "GET /master/channel/kode/:id": "master/DistributionChannelController.findOneByKode",
    "POST /master/channel": "master/DistributionChannelController.new",
    "PUT /master/channel": "master/DistributionChannelController.update",
    "DELETE /master/channel/:id": "master/DistributionChannelController.delete",
};