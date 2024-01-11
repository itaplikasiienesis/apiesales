/* eslint-disable no-undef */
module.exports.route = {

    "GET /produk": "master/ProdukController.find",
    "GET /produkall": "master/ProdukController.findAll",
    "GET /stuanterkecil": "master/ProdukController.findSatuanterkecil",
    "GET /produk/:id": "master/ProdukController.findOne",
    "GET /pricelist": "master/ProdukController.findPricelist",
    "GET /produk/kode": "master/ProdukController.findBykode",
    "POST /produk/kode": "master/ProdukController.findBykodeArray"

  };
      