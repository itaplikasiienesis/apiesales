/* eslint-disable no-undef */
module.exports.route = {
  "GET /proposalklaim": "transactions/KlaimProposalController.getKlaim",
  "GET /proposalklaim/export":
    "transactions/KlaimProposalController.exportExcel",
  "GET /partnerkey/:kode":
    "transactions/KlaimProposalController.findpartnerkey",
  "GET /proposalklaim/paymentterm":
    "transactions/KlaimProposalController.findpartnerpaymentterm",
  "GET /proposalklaim/list": "transactions/KlaimProposalController.find",
  "GET /proposalklaim/:id": "transactions/KlaimProposalController.findOne",
  "POST /proposalklaim": "transactions/KlaimProposalController.new",
  "POST /proposalklaim/newdirectoutlet":"transactions/KlaimProposalController.updatenew",
  "DELETE /proposalklaim": "transactions/KlaimProposalController.delete",
  "PUT /proposalklaim": "transactions/KlaimProposalController.updateKlaim",
  "GET /klaimproposal/file/:record/:filename":
    "transactions/KlaimProposalController.getfile",
  "GET /klaimproposal/getreasonreject":
    "transactions/KlaimProposalController.getReasonReject",
  "POST /proposalklaim/notifikasiklaim":
    "transactions/KlaimProposalController.notifikasiklaim",
  "POST /proposalklaim/apf":
    "transactions/KlaimProposalController.approveKlaim",
  "POST /proposalklaim/approve":
    "transactions/KlaimProposalController.approveKlaimStatus",
  "POST /proposalklaim/rjf":
    "transactions/KlaimProposalController.rejectKlaim",
  "POST /proposalklaim/skp": "transactions/KlaimProposalController.submitKlaim",
  "POST /proposalklaim/pay":
    "transactions/KlaimProposalController.statusBayarKlaim",
  "GET /proposalklaim/findebupot":
    "transactions/KlaimProposalController.findebupot",
  "POST /proposalklaim/pengiriman_dokument":"transactions/KlaimProposalController.pengiriman_dokument",
  "GET /proposalklaim/direcoutlet":
    "transactions/KlaimProposalController.direcoutlet",
};
