module.exports.route = {
    "GET /oee/dashboardlossdata": "transactions/oee/OeeDashboardLossDataController.find",
    "GET /oee/dashboardlossdatatimeyear": "transactions/oee/OeeDashboardLossDataController.findByTimeYear",
    "GET /oee/dashboardlossdowntime": "transactions/oee/OeeDashboardLossDataController.findLossDowntime"
};