// eslint-disable-next-line no-undef
module.exports.route = {
  "POST /cmo": "transactions/CMOController.new",
  "PUT /cmo": "transactions/CMOController.update",
  "PUT /cmo/reject": "transactions/CMOController.reject",
  "PUT /cmo/inactive": "transactions/CMOController.inactive",
  "PUT /cmo/edit": "transactions/CMOController.edit",
  "PUT /cmo/edititemcmo": "transactions/CMOController.edititemcmo",
  "GET /cmo": "transactions/CMOController.find",
  "GET /cmo/:id": "transactions/CMOController.view",
  "GET /cmo/report" : "report/CMOReportController.find", 
  "GET /cmo/report/excel" : "report/CMOReportController.getExportExcel",
  "GET /cmo/report/sodobill" : "report/CMOReportController.getsodobill2", 
  "GET /cmo/report/sodobill2" : "report/CMOReportController.getsodobill2", 
  "GET /cmo/export" : "transactions/CMOController.getExportExcel",
  "GET /cmo/showimage" : "transactions/CMOController.showimage",
  "GET /cmo/showFile" : "transactions/CMOController.showFile",
  "POST /cmo/getPromo": "transactions/CMOController.getPromo",
  "POST /read/excel": {
    controller: "utils/readexcel/CMOController",
    action: "read",
  },
  "GET /cmo/gettemplate/:filename": "transactions/CMOController.getTemplatefile",
};
