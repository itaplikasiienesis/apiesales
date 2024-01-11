/* eslint-disable no-undef */
module.exports.route = {
    "POST /disciplinary/email/employee": "transactions/disciplinary/email/EmailCreateController.forEmployee",
    "POST /disciplinary/email/hrhead": "transactions/disciplinary/email/EmailCreateController.forHrHead",
    "POST /disciplinary/email/posting/employee": "transactions/disciplinary/email/EmailPostingOrangeController.forEmployee",
    "POST /disciplinary/email/posting/issueby": "transactions/disciplinary/email/EmailPostingOrangeController.forIssueby"
};
    