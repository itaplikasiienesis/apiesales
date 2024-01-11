// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /shipment": "transactions/shipment.find",
    "GET /shipment/:id": "transactions/shipment.findOne",
    "GET /shipment/driver/:id": "transactions/shipment.findByDriver",
    "POST /shipment": "transactions/shipment.new",
    "PUT /shipment": "transactions/shipment.update",
    "DELETE /shipment": "transactions/shipment.delete",
    "POST /shipment/assigndriver": "transactions/shipment.assignDriver",
    "POST /shipment/assigndriverMultiple": "transactions/shipment.assignDriverMultiple"
  
  
  };
    