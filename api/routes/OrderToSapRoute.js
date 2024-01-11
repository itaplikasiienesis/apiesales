// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /ordertosap": "transactions/OrderToSapController.find",
    "GET /ordertosap/:id": "transactions/OrderToSapController.findOne",
    // "POST /cmotosap": "transactions/OrderToSapController.cmopostToSap",
    "POST /cmotosap": "transactions/OrderToSapController.cmopostToSapFtp",
    "POST /ordertosap": "transactions/OrderToSapController.ordertosap",
    // "POST /ordertosap/dpd": "transactions/OrderToSapController.orderTosapByDPD",
    "POST /ordertosap/dpd": "transactions/OrderToSapController.orderTosapByDPDFtp",
    "POST /ordertosap/checkcreditlimit": "transactions/OrderToSapController.cekCreditLimit",
    "POST /ordertosap/replace": "transactions/OrderToSapController.orderTosapPlace",
    "POST /ordertosap/replace/prod": "transactions/OrderToSapController.orderTosapPlaceProd",
    "POST /regeneratecmotosap": "transactions/OrderToSapController.regenerateCmoToSap",
    "POST /regeneratecmotosapmultiple": "transactions/OrderToSapController.regenerateCmoToSapMultiple",    
    "POST /ordertosap/dpd/regenerate": "transactions/OrderToSapController.orderTosapRegenerate",
    "POST /ordertosap/dpd/regeneratewaitingso": "transactions/OrderToSapController.orderTosapRegenerateWaitingSo",
    "POST /ordertosap/dpd/regenerateWeekTransaction": "transactions/OrderToSapController.regenerateWeekTransaction",
    
};
