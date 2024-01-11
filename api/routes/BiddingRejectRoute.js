// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /biddingreject": "transactions/BiddingRejectController.find",
    "GET /biddingreject/:id": "transactions/BiddingRejectController.findOne",
    "GET /findJumlahBiddingReject": "transactions/BiddingRejectController.findJumlahBiddingReject",
    "POST /biddingreject/assigndosap/konfirmasiLogistik": "transactions/BiddingRejectController.konfirmLogistik",
    "POST /biddingreject/assigndosap/rejectLogistik": "transactions/BiddingRejectController.rejectLogistik",
    "PUT /biddingreject/updateDataTranporter": "transactions/BiddingRejectController.updateDataTransporter",
    "PUT /biddingreject/bundleandconsole": "transactions/BiddingRejectController.updateBundleAndConsole"
};