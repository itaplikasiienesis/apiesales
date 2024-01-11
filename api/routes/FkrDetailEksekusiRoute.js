// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /fkreksekusi": "transactions/FkrDetailEksekusiController.find",
    "GET /fkreksekusi/:id": "transactions/FkrDetailEksekusiController.findOne",
    "POST /fkreksekusi/klasifikasi": "transactions/FkrDetailEksekusiController.klasifikasi",
    "PUT /fkreksekusi": "transactions/FkrDetailEksekusiController.update",
    "DELETE /fkreksekusi": "transactions/FkrDetailEksekusiController.delete"


  };
  