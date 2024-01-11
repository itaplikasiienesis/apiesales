// eslint-disable-next-line no-undef
module.exports.route = {
    "POST /rpo": "transactions/RPOController.new",
    "PUT /rpo": "transactions/RPOController.update",
    "GET /rpo": "transactions/RPOController.find",
    "GET /rpo/:id": "transactions/RPOController.view",
    "GET /rpo/report" : "report/CMOReportController.find", 
    "POST /read/excel": {
      controller: "utils/readexcel/CMOController",
      action: "read",
    }
  };
  