module.exports.route = {
  "POST /settlementva/getdatapembayaraneprop":
    "transactions/settlementva/PembayaranEpropController.getDataSoap",
  "POST /settlementva/uploadDataFile":
    "transactions/settlementva/PembayaranEpropController.uploadFileXlsx",
  "GET /settlementva/getBudgetId/:budgetId":
    "transactions/settlementva/PembayaranEpropController.getDataDetailCodeID",
  "POST /settlementva/uploadlengkap":
    "transactions/settlementva/PembayaranEpropController.uploadFileXlsxLengkap",
  "GET /settlementva/getListBudgetIdByNomorEprop":
  "transactions/settlementva/PembayaranEpropController.getListBudgetIdByNomorEprop",
  "POST /settlementva/lockTransaction":
  "transactions/settlementva/PembayaranEpropController.lockTransaction",
  "POST /settlementva/clearAdvance":
  "transactions/settlementva/PembayaranEpropController.clearAdvance",
  
  
    
};
