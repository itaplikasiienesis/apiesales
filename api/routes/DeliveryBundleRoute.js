// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /deliverybundle": "transactions/DeliveryBundleController.find",
    "GET /deliverybundle/:id": "transactions/DeliveryBundleController.findOne",
    "GET /assignprocurement": "transactions/DeliveryBundleAssigProcController.find",
    "GET /assignprocurement/:id": "transactions/DeliveryBundleAssigProcController.findOne",
    "POST /deliverybundle/assigndosap/konfirmasiLogistik": "transactions/DeliveryBundleController.konfirmLogistik",
    "POST /deliverybundle/assigndosap/rejectLogistik": "transactions/DeliveryBundleController.rejectLogistik",
    "PUT /deliverybundle/updateDataTranporter": "transactions/DeliveryBundleController.updateDataTransporter",
    "PUT /deliverybundle/bundleandconsole": "transactions/DeliveryBundleController.updateBundleAndConsole",
    "PUT /deliverybundle/switchTransporter": "transactions/DeliveryBundleController.switchTransporter",
    "PUT /deliverybundle/assignProcurement": "transactions/DeliveryBundleAssigProcController.assignProcurement",
    "GET /findJumlahApprovalBidding/:id": "transactions/DeliveryBundleController.findJumlahApprovalBidding",
    "GET /placed-order": "transactions/DeliveryBundleController.findPlacedOrderAll",
    "GET /placed-order-detail/:id": "transactions/DeliveryBundleController.findOne",
    "POST /deleteBundleOrConsole": "transactions/DeliveryBundleController.deleteBundleOrConsole",
    "GET /deliverybundle/exportexcel": "transactions/DeliveryBundleController.exportExcel",
    "GET /findJumlahAssignProc": "transactions/DeliveryBundleAssigProcController.findJumlahAssignProc",
    "PUT /assignprocurement/updateDataTranporter": "transactions/DeliveryBundleAssigProcController.updateDataTransporter",
    "GET /switchprocurement": "transactions/DeliveryBundleSwitchProcController.find",
    "GET /switchprocurement/:id": "transactions/DeliveryBundleSwitchProcController.findOne",
    "GET /findJumlahSwitchProc": "transactions/DeliveryBundleSwitchProcController.findJumlahSwitchProc",
    "GET /switchlog": "transactions/DeliveryBundleSwitchLogController.find",
    "GET /switchlog/:id": "transactions/DeliveryBundleSwitchLogController.findOne",
    "GET /findJumlahSwitchLog": "transactions/DeliveryBundleSwitchLogController.findJumlahSwitchLog",
    "PUT /deliverybundle/switchProcurement": "transactions/DeliveryBundleSwitchLogController.switchProcurement",    
    
};


