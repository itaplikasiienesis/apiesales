// eslint-disable-next-line no-undef

module.exports.route = {
  "POST /do": "transactions/DeliveryOrderController.new",
  "DELETE /do": "transactions/DeliveryOrderController.delete",
  "PUT /do/bundleandconsole": "transactions/DeliveryOrderController.updateBundleAndConsole",
  "PUT /do/updateDataTranporter": "transactions/DeliveryOrderController.updateDataTransporter",
  
  // "PUT /do": "transactions/DeliveryOrderController.update",
  "GET /do/bydriver": "transactions/DeliveryOrderController.dobyDriverId",
  "GET /do/bundlebydriver": "transactions/DeliveryOrderController.getBundleIdBydriver",
  "GET /do/bundlenotyetassign": "transactions/DeliveryOrderController.getBundleIdnotYetAssignDriver",
  "GET /do/carido": "transactions/DeliveryOrderController.cariDO",
  "GET /do/exportexcel": "transactions/DeliveryOrderController.getExportExcel",
  "GET /do": "transactions/DeliveryOrderController.find",
  "GET /do/:id": "transactions/DeliveryOrderController.view",
  "GET /do/release/:id": "transactions/DeliveryOrderController.viewRelease",
  "POST /do/pickingdo": "transactions/DeliveryOrderController.pickingDo",
  "POST /do/pickingdomultiple": "transactions/DeliveryOrderController.pickingDoMultiple",
  "POST /do/assigndosap/multiplenonbidding": "transactions/DeliveryOrderController.multipleassignDOSapNonBidding",
  "POST /do/assigndosap/multiple": "transactions/DeliveryOrderController.multipleassignDOSapRitase",
  "POST /do/assigndosap/konfirmasiLogistik": "transactions/DeliveryOrderController.konfirmLogistik",
  "POST /do/assigndosap/rejectLogistik": "transactions/DeliveryOrderController.rejectLogistik",
  "POST /do/updatedposition": "transactions/DeliveryOrderController.pushTrackingDo",
  "POST /do/pushstatusdo": "transactions/DeliveryOrderController.pushStatusDo",
  "POST /do/pushstatusdo/multiple": "transactions/DeliveryOrderController.pushStatusDoMultiple",
  "POST /do/reportdestination": "transactions/DeliveryOrderController.Takedestination",
  "POST /do/reportdestination/multiple": "transactions/DeliveryOrderController.TakedestinationMultiple",
  "POST /do/save": "transactions/DeliveryOrderController.simpanDo",
  "POST /do/provedelivery": "transactions/DeliveryOrderController.proveDelivery",
  "POST /do/uploadpod": "transactions/DeliveryOrderController.uploadFilePod",
  "POST /do/cancelOrder": "transactions/DeliveryOrderController.cancelOrder",
  "POST /do/uploadAddCost": "transactions/DeliveryOrderController.uploadAddCost",

  "POST /do/changedriver": "transactions/DeliveryOrderController.changeDriver",
  "GET /do/readyinvoice": "transactions/DeliveryOrderController.doReadytoInvoice",
  "GET /bundle/readyinvoice": "transactions/DeliveryOrderController.bundleReadytoInvoice",
  "GET /do/file/:record/:filename": "transactions/DeliveryOrderController.getfile",
  "GET /do/image/:record/:filename": "transactions/DeliveryOrderController.showimage",
  "GET /do/getbidding/:bidd": "transactions/DeliveryOrderController.getbidding",
  "GET /misspart": "transactions/DeliveryOrderController.find_misspart",
  "GET /viewmisspart": "transactions/DeliveryOrderController.view_misspart",
  "GET /do/fileBA/:record/:filename": "transactions/DeliveryOrderController.getfileBA",
  "POST /do/provedeliverynew": "transactions/DeliveryOrderController.proveDelivery_new",
  "GET /do/datatracking": "transactions/DeliveryOrderController.findTrackingDo",
  "GET /do/datadrafttracking": "transactions/DeliveryOrderController.findTrackingDoDraft",
  "GET /do/filepod": "transactions/DeliveryOrderController.getfilePod",
  "POST /do/podmanual": "transactions/DeliveryOrderController.podDist_manual",
  "POST /do/inject_shipment": "transactions/DeliveryOrderController.inject_shipment"
  

};

