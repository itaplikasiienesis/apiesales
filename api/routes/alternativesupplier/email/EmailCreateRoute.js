module.exports.route = {
    "POST /alternativesupplier/email/approval": "transactions/alternativesupplier/email/EmailCreateController.forApprove",
    "POST /alternativesupplier/email/resulttesting": "transactions/alternativesupplier/email/EmailCreateController.forNeedResult",
    "POST /alternativesupplier/email/finish": "transactions/alternativesupplier/email/EmailCreateController.forFinish"
};