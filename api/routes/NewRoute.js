module.exports.route = {
    "GET /newbewlajar": "dev/NewController.find",
    "GET /getsimple": "dev/NewController.getsimple",
    "POST /testemail": "dev/NewController.testemailFKR", 
    "POST /testsplit": "dev/NewController.testSplitString", 
    "POST /perbaikanNomorKlaim": "dev/NewController.prosesPerbaikanNomorKlaim",
    "POST /perbaikanNomorKlaimultiple": "dev/NewController.prosesPerbaikanNomorKlaimMultipleSoldto",
    "POST /emailulang": "dev/NewController.emailUlangFKRNeedApproval",
    "POST /klaimValidateHeader": "dev/NewController.klaimValidateHeader",
    "POST /kirimulangemailapproval": "dev/NewController.kirimUlangEmailApproval",
    "POST /testemailFKR": "dev/NewController.testemailFKR",
    "POST /updateheaderklaim": "dev/NewController.updateHeaderKlaim",
    "GET /testLogic": "dev/NewController.testLogic"



};
    