/* eslint-disable no-undef */
module.exports.route = {
    "GET /proposal": "transactions/eproposal/CreateProposalController.find",
    "POST /proposal": "transactions/eproposal/CreateProposalController.create",
    "GET /proposal/:id": "transactions/eproposal/CreateProposalController.findOne",
    "GET /proposal/file/:record/:filename": "transactions/eproposal/CreateProposalController.getfile",
    "POST /proposalDummy": "transactions/eproposal/CreateProposalController.dummyCreate",
    "POST /checkbudget": "transactions/eproposal/CreateProposalController.checkbudget",
    "POST /generateapproval": "transactions/eproposal/CreateProposalController.generateApproval",
    "GET /proposalapprove": "transactions/eproposal/ProposalApprovalController.find",
    "POST /proposalapprove_approve": "transactions/eproposal/ProposalApprovalController.approve",
    "POST /proposalcancel": "transactions/eproposal/ProposalApprovalController.cancel",
    "GET /proposalapprove_approve/:proposal_approval_id/:type/:employee_id/:company_id": "transactions/eproposal/ProposalApprovalController.approvebylink",
    "GET /dummystatic": "transactions/eproposal/ProposalApprovalController.dummystatic",


  };

    

  