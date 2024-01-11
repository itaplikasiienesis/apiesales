module.exports.route = {
    "POST /blast/email": "transactions/centraldatabase/BlastEmailController.send",
    "POST /blast/sms": "transactions/centraldatabase/BlastSmsController.send"
};