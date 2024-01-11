module.exports.route = {
    "GET /master/plant": "master/PlantController.find",
    "GET /plant": "master/PlantController.findAll",
    "GET /master/plant/:id": "master/PlantController.findOne"
  };
    