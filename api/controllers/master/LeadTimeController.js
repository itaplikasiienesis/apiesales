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
const axios = require("axios");
module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: { currentPage, pageSize,searchText}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);


      
      let WhereSearchText = ``;
      if(searchText){
        WhereSearchText = `AND kode_distributor = '${searchText}'`
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM r_late_time WHERE 1=1 ${WhereSearchText}`;

      let queryDataTable = `SELECT * FROM r_late_time WHERE 1=1 ${WhereSearchText}
                            ORDER BY created DESC
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

      let queryDataTable = `SELECT * FROM r_late_time WHERE r_late_time_id='${req.param(
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

  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const { nik, nama, kode_distributor, waktu} = req.body;
    console.log(req.body);
    console.log('INSERT YA');
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO r_late_time
                    ( r_late_time_id,createdby, updatedby, kode_distributor, nama, waktu )
                   VALUES (
                    '${uuid()}',
                    '${nik}',
                    '${nik}',
                    '${kode_distributor}',
                    '${nama}',
                    '${waktu}'
                  )`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          data: result,
          message: "Insert data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const { nik,id,nama, kode_distributor, waktu} = req.body;
    console.log(req.body);
    console.log('UPDATE YA');

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE r_late_time SET updatedby = '${nik}',
                    nama = '${nama}',
                    kode_distributor = '${kode_distributor}',
                    waktu = '${waktu}'
                   WHERE r_late_time_id='${id}'`;

                   console.log(sql);

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Update data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  // DELETE RESOURCE
  delete: async function(req, res) {    
    const id = req.param("id");

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM r_late_time WHERE r_late_time_id='${id}'`;
      console.log(sql);

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        return res.success({
          data: result,
          message: "Delete data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};

//Disini kita buat fungsi dengan algoritma rekursif
function dapatkanMobilIdealDanKawannya(data_kendaraan = [], tonase, kubikasi, arrayHasil = []) {
  if (data_kendaraan.length === 0) {
    return []
  }

  const hasil = _.sortBy(data_kendaraan, ["tonase", "kubikasi"]).reverse().map(x => {
    return {
      ...x,
      sisa_tonase:  tonase - x.tonase,
      sisa_kubikasi:  kubikasi - x.kubikasi,
    }
  })
 
    const dataTerpilih = (hasil.filter(x => x.tonase >= tonase && x.kubikasi >= kubikasi).length > 0) 
                          ? hasil.filter(x => x.tonase >= tonase && x.kubikasi >= kubikasi).reverse()[0] 
                          : hasil[0]

                         
 
  if (dataTerpilih.sisa_tonase > 0 || dataTerpilih.sisa_kubikasi > 0) {
    // delete dataTerpilih.sisa_tonase
    // delete dataTerpilih.sisa_kubikasi
    arrayHasil.push(dataTerpilih)
    return dapatkanMobilIdealDanKawannya(data_kendaraan, dataTerpilih.sisa_tonase, dataTerpilih.sisa_kubikasi, arrayHasil) //kondisi rekursif disini adalah jalankan fungsi ini hingga sisa tonase dan kubikasi di bawah 0 
  } else {
    // delete dataTerpilih.sisa_tonase
    // delete dataTerpilih.sisa_kubikasi
    arrayHasil.push(dataTerpilih)
    return arrayHasil  
  }
}
