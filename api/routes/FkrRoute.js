// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /fkr": "transactions/FkrController.find",
    "GET /fkrApproveCmo": "transactions/FkrController.findApproveCeo",
    "GET /countFkrApprove": "transactions/FkrController.countFkrApprove",
    "GET /fkr/:id": "transactions/FkrController.findOne",
    "GET /fkr/print/:id": "transactions/FkrController.cetakFKR",
    "POST /fkr/pushBAP": "transactions/FkrController.pushBAP",
    "POST /fkr/pushBAPKembali": "transactions/FkrController.pushBAPKembali",
    "POST /fkr/pushfile": "transactions/FkrController.pushfile",
    "POST /fkr/uploadIom": "transactions/FkrController.uploadIom",
    "GET /fkr/getfilebap": "transactions/FkrController.getfileBAP",
    "GET /fkr/getfileiom": "transactions/FkrController.getfileIOM",
    "GET /fkr/getfilebapkembali": "transactions/FkrController.getfileBAPBalikan",
    "POST /fkr/save": "utils/readexcel/UploadFkrController.saveFKR2",
    "POST /fkr/savenonbast": "utils/readexcel/UploadFkrController.saveFKRNonBAST2",
    "POST /fkr/savenonbast2": "utils/readexcel/UploadFkrController.saveFKRNonBAST2",
    "GET /fkr/file/:record/:filename": "utils/readexcel/UploadFkrController.getfile",
    "POST /fkr/rjf": "utils/readexcel/UploadFkrController.rejectFKR",
    "POST /fkr/approveasdh": "transactions/FkrController.approveFKR",
    "POST /fkr/kirimDokumen": "transactions/FkrController.pengiriman_dokument",
    "POST /fkr/loadgrcn": "transactions/FkrController.loadGrCn",
    "GET /fkr/gettemplate/:filename": "transactions/FkrController.getTemplatefile",
    "GET /fkr/exportexcel": "transactions/FkrController.exportExcel",
    // "GET /fkr/getexportexcel": "transactions/FkrController.exportExcel",
    "GET /fkr/getexportexcel": "transactions/FkrController.getexportExcel",
    "GET /fkr/help": "transactions/FkrController.help",
    "POST /fkr/verifikasiFKR" : "transactions/FkrController.verifikasiFKR",
    "POST /fkr/cekharga" : "utils/readexcel/UploadFkrController.cekHarga",
    "POST /fkr/saveFKRnew" : "transactions/FkrController.saveFKRnew",
    "POST /fkr/notifikasifkr" : "transactions/FkrController.notifikasifkr",
    "POST /fkr/verifikasiBA" : "transactions/FkrController.verifikasiBA",
    "POST /fkr/holdfkr" : "transactions/FkrController.holdfkr",
    "POST /fkr/refreshso" : "transactions/FkrController.refreshso",
    "POST /fkr/editdokfkr" : "transactions/FkrController.editdokfkr",
    "GET /fkr/reject": "transactions/fkr/RejectFKRController.rejectFKR",
    "POST /fkr/rejectFkrBaru": "transactions/fkr/RejectFKRController.rejectFkrBaru",
    "GET /fkr/approve": "transactions/fkr/ApproveFKRController.approveFKR"
  };
  