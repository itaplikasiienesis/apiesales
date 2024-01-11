/* eslint-disable no-undef */
module.exports.route = {
    "GET /sp": "transactions/disciplinary/DisciplinaryController.find",
    "GET /sp/:id": "transactions/disciplinary/DisciplinaryController.findOne",
    "POST /sp": "transactions/disciplinary/DisciplinaryController.new",
    "POST /sp/update": "transactions/disciplinary/DisciplinaryController.update",
    "POST /sp/submitorange": "transactions/disciplinary/DisciplinaryController.submitorange"
  };
    