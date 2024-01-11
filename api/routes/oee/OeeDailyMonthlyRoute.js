module.exports.route = {
    "GET /oee/daily": "transactions/oee/OeeDailyMonthlyController.findDaily",
    "GET /oee/monthly": "transactions/oee/OeeDailyMonthlyController.findMonthly",
    "GET /oee/daily/exportexcel": "transactions/oee/OeeDailyMonthlyController.exportExcelDaily",
    "GET /oee/monthly/exportexcel": "transactions/oee/OeeDailyMonthlyController.exportExcelMonthly",
};