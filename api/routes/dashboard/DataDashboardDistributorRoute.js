/* eslint-disable no-undef */
module.exports.route = {
    "GET /dashboard/distributor/klaim": "transactions/dashboard/DataDashboardDistributorController.klaim",
    "GET /dashboard/distributor/klaim/status": "transactions/dashboard/DataDashboardDistributorController.TrackingStatus",
    "GET /dashboard/distributor/fkr/status": "transactions/dashboard/DataDashboardDistributorController.dataFkr",
    "GET /dashboard/distributor/purchase": "transactions/dashboard/DataDashboardDistributorController.purchase",
    "GET /dashboard/distributor/topBrandCmo": "transactions/dashboard/DataDashboardDistributorController.topBrandCmo",
    "GET /dashboard/distributor/so": "transactions/dashboard/DataDashboardDistributorController.dataSo"

    
};
    