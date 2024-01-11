/* eslint-disable no-undef */
module.exports.route = {
    "GET /biddingshipment": "transactions/BiddingShipmentController.find",
    "GET /biddingshipment/:id": "transactions/BiddingShipmentController.findOne",
    "GET /biddingshipment/order": "transactions/BiddingShipmentController.findBiddingOrder",
    "POST /biddingshipment": "transactions/BiddingShipmentController.new",
    "POST /fillbucket": "transactions/BiddingShipmentController.fillbucket",
    "POST /biddingshipment/quotation": "transactions/BiddingShipmentController.sendQuotation",
    "PUT /biddingshipment": "transactions/BiddingShipmentController.update",
    "DELETE /biddingshipment": "transactions/BiddingShipmentController.delete",
    "GET /getOne": "transactions/BiddingShipmentController.getOne",
    "GET /biddingshipment/findBidding": "transactions/BiddingShipmentController.findBidding",
    "GET /hitungpenawaran": "transactions/BiddingShipmentController.hitungpenawaran",
  };
    