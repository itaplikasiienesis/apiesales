module.exports.route = {
    "POST /upload/skureplacement": "utils/readexcel/UploadSkuReplacementController.upload",
    "POST /upload/skureplacementallshipto": "utils/readexcel/UploadSkuReplacementAllshiptoController.upload",
    "POST /upload/skureplacementnonaktif": "utils/readexcel/UploadSkuReplacementNonAktifController.upload",
    "POST /upload/skureplacementnonaktif/uploadBukti": "utils/readexcel/UploadSkuReplacementNonAktifController.uploadBukti",
    "POST /upload/skureplacementByWeek": "utils/readexcel/UploadSkuReplacementByWeekController.upload",
};