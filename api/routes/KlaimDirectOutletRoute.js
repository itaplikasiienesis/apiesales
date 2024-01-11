/* eslint-disable no-undef */
module.exports.route = {
  "POST /klaimdirectoutlet/newdirectoutlet": "transactions/KlaimDirectOutletController.new",
  "POST /klaimdirectoutlet/approvals": "transactions/KlaimDirectOutletController.approveKlaim",
  "POST /klaimdirectoutlet/rejects": "transactions/KlaimDirectOutletController.rejects",
  "GET /klaimdirectoutlet/list": "transactions/KlaimDirectOutletController.find",
  "GET /klaimdirectoutlet/:id": "transactions/KlaimDirectOutletController.findOne",
  "POST /klaimdirectoutlet/skp": "transactions/KlaimDirectOutletController.submitKlaim",
  "POST /klaimdirectoutlet/approve": "transactions/KlaimDirectOutletController.approveKlaimstatus",
  "GET /klaimdirectoutlet/export":
  "transactions/KlaimDirectOutletController.exportExcel",
};
