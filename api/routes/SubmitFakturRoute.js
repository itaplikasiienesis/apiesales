// eslint-disable-next-line no-undef
module.exports.route = {

    "GET /submitfaktur": "transactions/SubmitFakturController.find",
    "GET /submitfaktur/:id": "transactions/SubmitFakturController.findOne",
    "GET /submitfaktur/findHistory/:id": "transactions/SubmitFakturController.findHistory",
    "GET /submitfaktur/cekbast": "transactions/SubmitFakturController.cekBAST",
    "GET /submitfaktur/cetak/:id": "transactions/SubmitFakturController.cetakNPB",
    "POST /submitfaktur": "transactions/SubmitFakturController.new",
    "PUT /submitfaktur": "transactions/SubmitFakturController.update",
    "DELETE /submitfaktur": "transactions/SubmitFakturController.delete",
    "GET /submitfaktur/file/:record/:filename": "transactions/SubmitFakturController.getfile",
    "POST /submitfaktur/apl": "transactions/SubmitFakturController.approveNpb",
    "POST /submitfaktur/rjl": "transactions/SubmitFakturController.rejectNpb",
    "POST /submitfaktur/apf": "transactions/SubmitFakturController.approveFinance",
    "POST /submitfaktur/rpf": "transactions/SubmitFakturController.rejectFinance",
    "GET /submitfaktur/getServiceLevel/:id": "transactions/SubmitFakturController.getServiceLevel",
    "POST /submitfaktur/calculateHeader": "transactions/SubmitFakturController.calculateHeader"
    
  };
    