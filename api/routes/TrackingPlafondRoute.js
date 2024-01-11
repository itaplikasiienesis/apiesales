/* eslint-disable no-undef */
module.exports.route = {
    "GET /trackingplafond": "report/TrackingPlafondController.getdatafromsap2",
    "GET /trackingplafond2": "report/TrackingPlafondController.getdatafromsap2",
    "GET /trackingplafond/:kode": "report/TrackingPlafondController.findOne",
    "GET /listsoldto": "report/TrackingPlafondController.findDropdown",
    "GET /trackingplafond/export/:kode": "report/TrackingPlafondController.exportExcelBykode",
    "GET /trackingplafond/export": "report/TrackingPlafondController.exportExcel",
    "GET /trackingplafond/list": "report/TrackingPlafondController.getdata"
  };
    