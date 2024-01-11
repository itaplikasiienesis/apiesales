/* eslint-disable no-undef */
module.exports.route = {
  "GET /proposalklaim": "transactions/klaim/KlaimProposalController.getKlaim",
  "GET /proposalklaim/findBudget": "transactions/klaim/KlaimProposalController.getBudget",
  "POST /proposalklaim/rejectPo": "transactions/klaim/KlaimProposalController.rejectPo",
  "GET /proposalklaim/export":
    "transactions/klaim/KlaimProposalController.exportExcel",
  "GET /partnerkey/:kode":
    "transactions/klaim/KlaimProposalController.findpartnerkey",
  "GET /proposalklaim/paymentterm":
    "transactions/klaim/KlaimProposalController.findpartnerpaymentterm",
  "GET /proposalklaim/list": "transactions/klaim/KlaimProposalController.find",
  "GET /proposalklaim/:id": "transactions/klaim/KlaimProposalController.findOne",
  "GET /proposalklaim/findAudit/:id": "transactions/klaim/KlaimProposalController.findAudit",
  "GET /proposalklaim/getApprovalKlaim/:id": "transactions/klaim/KlaimProposalController.getApprovalKlaim",
  "POST /proposalklaim": "transactions/klaim/KlaimProposalController.new",
  "POST /proposalklaim/newdirectoutlet":"transactions/klaim/KlaimProposalController.updatenew",
  "DELETE /proposalklaim": "transactions/klaim/KlaimProposalController.delete",
  "PUT /proposalklaim": "transactions/klaim/KlaimProposalController.updateKlaim",
  "GET /klaimproposal/file/:record/:filename":
    "transactions/klaim/KlaimProposalController.getfile",
  "GET /klaimproposal/getreasonreject":
    "transactions/klaim/KlaimProposalController.getReasonReject",
  "POST /proposalklaim/notifikasiklaim":
    "transactions/klaim/KlaimProposalController.notifikasiklaim",
  "POST /proposalklaim/apf":
    "transactions/klaim/KlaimProposalController.approveKlaim",
  "POST /proposalklaim/rjf":
    "transactions/klaim/KlaimProposalController.rejectKlaim",
  "POST /proposalklaim/skp": "transactions/klaim/KlaimProposalController.submitKlaim",
  "POST /proposalklaim/pay":
    "transactions/klaim/KlaimProposalController.statusBayarKlaim",
  "GET /proposalklaim/findebupot":
    "transactions/klaim/KlaimProposalController.findebupot",
  "POST /proposalklaim/pengiriman_dokument":"transactions/klaim/KlaimProposalController.pengiriman_dokument",
  "GET /proposalklaim/direcoutlet":
    "transactions/klaim/KlaimProposalController.direcoutlet",
  "GET /proposalklaim/getKlaimDetailByKlaimId/:id":
    "transactions/klaim/KlaimProposalController.getKlaimDetailByKlaimId",
};
