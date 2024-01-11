module.exports.route = {
    "GET /dashboard/downtimeversusoee": "transactions/oee/OeeDowntimeVersusOeeController.find",
    "GET /dashboard/downtimeversusavgoee": "transactions/oee/OeeDowntimeVersusOeeController.findAvgVersusOeeDowntime",
    "GET /dashboard/downtimetoplowest": "transactions/oee/OeeDowntimeVersusOeeController.findTopLowest",
    "GET /dashboard/downtimedetail": "transactions/oee/OeeDowntimeVersusOeeController.findDetailDonwtime",    

};

    