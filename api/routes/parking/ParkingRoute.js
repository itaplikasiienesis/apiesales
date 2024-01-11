module.exports.route = {
    "POST /parking/save": "transactions/parking/ParkingController.save",
    "POST /parking/savebase64": "transactions/parking/ParkingController.save2",
    "GET /parking/find": "transactions/parking/ParkingController.findOne",
    "GET /parking/list": "transactions/parking/ParkingController.find",
    "GET /parking/exportexcel": "transactions/parking/ParkingController.exportExcel",
    // "GET /parking/showimage": "transactions/ParkingController.showimage",
    // "GET /parking/showimage/:record/:filename": "transactions/ParkingController.showimage",
    "GET /parking/image/:record/:filename": "transactions/parking/ParkingController.showimage",
    "POST /parking/updatePosisi": "transactions/parking/ParkingController.updatePosisi",
    "POST /parking/loading": "transactions/parking/ParkingController.loading",
    "POST /parking/finishLoad": "transactions/parking/ParkingController.finishLoad",
    "POST /parking/checkout": "transactions/parking/ParkingController.checkout",
    "POST /parking/summary": "transactions/parking/ParkingController.summary",
    "GET /parking/cetak/:id": "transactions/parking/ParkingController.cetak",
    "GET /parking/cetakkendaraan/:id": "transactions/parking/ParkingController.cetakDataKendaraan",
    "GET /parking/detaildashboard": "transactions/parking/ParkingController.findListDetailDashboard",
    "GET /parking/:id": "transactions/parking/ParkingController.detail",
    "DELETE /parking/:id": "transactions/parking/ParkingController.delete"

    
    
};