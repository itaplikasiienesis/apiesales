/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const axios = require('axios');
const FormData = require('form-data');
module.exports = {
  // GET ALL RESOURCE

  findAll : async function(req, res){
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let queryDataTable = `SELECT * FROM m_produk
                            ORDER BY kode_sap`

                            
      let ProdukAll = await request.query(queryDataTable);
      ProdukAll = ProdukAll.recordset;
      // console.log(ProdukAll);
      return res.success({
        result: ProdukAll,
        message: "Fetch data successfully"
      });
    }catch(err){
      console.log(err);

    }
  },
  findSatuanterkecil: async function(req, res){
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let queryDataTable = `SELECT a.kode,nama,kode_satuan,b.keterangan,Harga from r_satuan_mapping_fkr a
              left join r_satuan_terkecil b on a.kode_satuan = b.kode`

                            console.log(queryDataTable);
      let ProdukAll = await request.query(queryDataTable);
      ProdukAll = ProdukAll.recordset;
      console.log(ProdukAll.length);
      return res.success({
        result: ProdukAll,
        message: "Fetch data successfully"
      });
    }catch(err){
      console.log(err);
    }
  },
  findPricelist : async function(req,res){
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let queryDataTable = `select a.kode,a.nama,b.nama as channel, harga from m_pricelist a
      inner join r_distribution_channel b on a.r_distribution_channel_id = b.r_distribution_channel_id`

      console.log(queryDataTable);
      let ProdukAll = await request.query(queryDataTable);
      ProdukAll = ProdukAll.recordset;
      console.log(ProdukAll.length);
      return res.success({
        result: ProdukAll,
        message: "Fetch data successfully"
      });
    }catch(err){
      console.log(err);
    }
  },
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM m_produk ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_produk ${whereClause}
                            ORDER BY kode
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;


      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        /**
         * {
         *    result : data utama,
         *    meta : data tambahan ( optional ),
         *    status : status response ( optional),
         *    message : pesan ( optional )
         * }
         */

        return res.success({
          result: rows,
          meta,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // GET ONE RESOURCE
  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryDataTable = `SELECT * FROM m_produk WHERE m_produk_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },
  findBykode: async function(req, res) {
    await DB.poolConnect;
    const {
      query: { kode, kode_distributor }
    } = req;
    try {
      const request = DB.pool.request();
      let queryDataTable = `SELECT * FROM m_produk WHERE kode='${kode}'`;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }
        const row = result.recordset[0];

        if(result.recordset.length > 0){

          row.stock_awal = 250
          row.stock_pending = 700

        }


        // const token = `$2y$10$cpWMk18MjOX\/1nlzY51yS..EY9VdEIgrT\/\/RbcyF6VLoWtgKXxJi6`;
        // const url = 'http://stock.esales.enesis.com/stock/api/cekstok.php'
        // const bodyFormData = new FormData();
        // bodyFormData.append('dist_id', kode_distributor);
        // bodyFormData.append('kode_produk', kode);
        // bodyFormData.append('token', token);
        // const options = {
        // method: 'POST',
        // headers: { 'content-type': 'multipart/form-data' },
        // data: bodyFormData,
        // url,
        // }

        // axios(options).then((result) => {
        //     let data = result.data
        //     console.log(data);

        // })

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  findBykodeArray: async function(req, res) {
    await DB.poolConnect;
    const {
      kode, kode_distributor
    } = req.body;
    try {
      const request = DB.pool.request();

      let valueIN = ""
      let Order1 = ""
      for (const datas of kode) {
      valueIN+= ",'"+datas.kode+"'"
      Order1+= ",'"+datas.order1+"'"
      }
      valueIN = valueIN.substring(1)
      Order1 = Order1.substring(1)



      let query = `SELECT * FROM m_produk WHERE kode IN (${valueIN})`      
      request.query(query,async (err, result) => {
        if (err) {
          return res.error(err);
        }
        const rows = result.recordset;

        let sumOrderTonase1 = 0;
        let sumOrderTonase2 = 0;
        let sumOrderTonase3 = 0;
        let sumOrderTonase4 = 0;

        let sumOrderKubikasi1 = 0;
        let sumOrderKubikasi2 = 0;
        let sumOrderKubikasi3 = 0;
        let sumOrderKubikasi4 = 0;

        for(let i=0 ; i<kode.length ; i++){

          let produk =  getTonaseKubikasi(rows,kode[i].kode)
          let tonase = produk.tonase
          let kubikasi = produk.kubikasi

          let tonaseOrder1 = tonase * kode[i].order1;
          let tonaseOrder2 = tonase * kode[i].order2;
          let tonaseOrder3 = tonase * kode[i].order3;
          let tonaseOrder4 = tonase * kode[i].order4;

          let kubikasiOrder1 = kubikasi * kode[i].order1;
          let kubikasiOrder2 = kubikasi * kode[i].order2;
          let kubikasiOrder3 = kubikasi * kode[i].order3;
          let kubikasiOrder4 = kubikasi * kode[i].order4;



          sumOrderTonase1 = sumOrderTonase1 + tonaseOrder1;
          sumOrderTonase2 = sumOrderTonase2 + tonaseOrder2;
          sumOrderTonase3 = sumOrderTonase3 + tonaseOrder3;
          sumOrderTonase4 = sumOrderTonase4 + tonaseOrder4;

          sumOrderKubikasi1 = sumOrderKubikasi1 + kubikasiOrder1;
          sumOrderKubikasi2 = sumOrderKubikasi2 + kubikasiOrder2;
          sumOrderKubikasi3 = sumOrderKubikasi3 + kubikasiOrder3;
          sumOrderKubikasi4 = sumOrderKubikasi4 + kubikasiOrder4;

        }


        let obj = {

          sumOrderTonase1:sumOrderTonase1,
          sumOrderTonase2:sumOrderTonase2,
          sumOrderTonase3:sumOrderTonase3,
          sumOrderTonase4:sumOrderTonase4,
          sumOrderKubikasi1:sumOrderKubikasi1,
          sumOrderKubikasi2:sumOrderKubikasi2,
          sumOrderKubikasi3:sumOrderKubikasi3,
          sumOrderKubikasi4:sumOrderKubikasi4,
          stock_awal:250,
          stock_pending:700

        }


        return res.success({
          result: obj,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};



function getTonaseKubikasi(produk,kode) {

  let hasilresultterpencil= produk.find(prod => prod.kode == kode)

  return hasilresultterpencil

}
