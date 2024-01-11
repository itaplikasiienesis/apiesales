/* eslint-disable no-undef */
module.exports.route = {
    "GET /ceknik": "absent/AbsentController.ceknik",
    "GET /listabsent": "absent/AbsentController.historicalabsent",
    "POST /absent": "absent/AbsentController.pushabsen",
    "GET /distance": "absent/AbsentController.getareaabsent",
    "GET /absennow": "absent/AbsentController.getabsennow",
    "POST /register/employee": "absent/AbsentController.register",
    "POST /login/employee": "absent/AbsentController.login",
    "POST /submitattendance": "absent/AbsentController.submitattendance",
    "POST /sinkronisasipassword": "absent/AbsentController.synconizePassword",
    "DELETE /reset/employee": "absent/AbsentController.reset",
    "POST /setwfh": "absent/AbsentController.updatewfh",
    "POST /submitattendancemanual": "absent/AbsentController.submitattendancemanual",

  };
    