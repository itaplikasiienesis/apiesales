module.exports.route = {
    "GET /master/mesin": "master/MesinController.find",
    "GET /mesin": "master/MesinController.findAll",
    "GET /master/mesin/:id": "master/MesinController.findOne",
    "GET /master/detailmesin/:id": "master/MesinController.findDetailMesin",
    "POST /master/detailmesin": "master/MesinController.new",
    "POST /master/detailmesin/delete": "master/MesinController.delete",
    "GET /master/detailmesin/info/:id": "master/MesinController.findOneDetail",
    "GET /master/detailmesin/list": "master/MesinController.findDataMesin",
    "POST /master/detailmesin/edit": "master/MesinController.edit",
    "GET /mesinloss": "master/MesinController.findDataMesinLoss",

    
    
  };
    