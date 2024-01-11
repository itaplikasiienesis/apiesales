// eslint-disable-next-line no-undef
module.exports.route = {
    
    "GET /order": "transactions/OrderController.find",
    "GET /order/:id": "transactions/OrderController.view",
    "PUT /order": "transactions/OrderController.update"
    
};
