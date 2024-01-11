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
      query: { currentPage, pageSize }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM r_kendaraan ${whereClause}`;

      let queryDataTable = `SELECT * FROM r_kendaraan ${whereClause}
                            ORDER BY r_kendaraan_id
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

      let queryDataTable = `SELECT * FROM r_kendaraan WHERE r_kendaraan_id='${req.param(
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
  // GET ONE RESOURCE
  calculation: async function(req, res) {
    await DB.poolConnect;
    const { tonase,kubikasi} = req.body;
    // let totalTonaseKubikasi = parseInt(tonase) + parseInt(kubikasi)
    try {
      const request = DB.pool.request();
      let queryDataTable = 'SELECT * from r_kendaraan order by tonase,kubikasi' //pakai JS aja yas, ini termasuk logic yg melampui batas SQL
      const data_kendaraan = await request.query(queryDataTable)
      let row = dapatkanMobilIdealDanKawannya(data_kendaraan.recordset, tonase, kubikasi, []).map(x => {
        delete x.sisa_tonase
        delete x.sisa_kubikasi
        return x
      })

      //ini query fachmi kemarin masih ada kurangnya jika kapasitas overload kendaraan ga dapat mi
      // let queryDataTable = `SELECT
      //                         TOP 1 
      //                         k.*, 
      //                         ((k.tonase+k.kubikasi) / 2) AS nilai_gabungan 
      //                       FROM 
      //                         r_kendaraan k 
      //                       WHERE
      //                         (k.tonase >= ${tonase} AND k.kubikasi >= ${kubikasi}) 
      //                         AND ( (k.tonase+k.kubikasi) / 2 >= (${totalTonaseKubikasi}) /2 ) 
      //                       ORDER BY nilai_gabungan
      //                     `;
    
      

      // request.query(queryDataTable,async (err, result) => {
      //   if (err) {
      //     return res.error(err);hasil.
      //   }

      //   if(result.recordset.length > 0){

      //      row.push(result.recordset[0]);
      //      delete row.nilai_gabungan;
           
      //   }
        // else{
        //   //nah saya sisatin disini kalau ga dapet saya ambil kendaraan yang kapasitasnya maximal
        //   //tapi masih ada kurangnya jika kapasitas maksimal mereka pengennya mobil maksimal muncul dan sisa dari overload dicarikan lagi kendaraannya
          
        //   //Contoh 1
        //   //Misal mobil maksimal angkut 30000 tonase sedangkan ordernya 35000 tonase otomatis dia rekomendasi 2 kendaraan yaitu
        //   // Mobil A dengan kapasitas 30000 dan Mobil B dengan kapasitas 5000


        //   //Contoh 1
        //   //Misal mobil maksimal angkut 30000 tonase sedangkan ordernya 40000 tonase otomatis dia rekomendasi 2 kendaraan yaitu
        //   // Mobil A dengan kapasitas 30000 dan Mobil C dengan kapasitas 10000

        //   //Kesimpulannya sisa angkut juga harus memperhatikan efisiensi kapasitas kendaraan yang ada mi seperti query yang fachmi buat sebelumnya
        //   // Intinya di partisi angkutannya mi

        //   let hasil = await request.query(`
        //   SELECT * FROM r_kendaraan WHERE 
        //   tonase = (select 
        //   MAX(tonase) from r_kendaraan) OR 
        //   kubikasi = (select 
        //   MAX(kubikasi) from r_kendaraan)`)          
        //   row.push(hasil.recordset[0]);

        //   let kapasitastonase = hasil.recordset[0].tonase
        //   let kapasitaskubikasi = hasil.recordset[0].kapasitaskubikasi
          
        //   let hasilmuatan = Math.ceil(tonase % kapasitastonase) + Math.ceil(tonase / kapasitastonase)
          
        //   //lanjut logicnya disini aja mi
        //   // for(let i = 1 ; i<=hasilmuatan ; i++){

        //   // }
        //   // console.log('hasilmuatan ',hasilmuatan);
          

        // }



        // for(let i=0; i < row.length ; i++){
        //   delete row[i].nilai_gabungan
        // }
        
        
        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      // });
    } catch (err) {
      return res.error(err);
    }
  },

  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const { m_user_id, nama} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO r_kendaraan
                    ( r_kendaraan_id,createdby, updatedby, nama )
                   VALUES (
                    '${uuid()}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${nama}'
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
    const { m_user_id,id,nama} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE r_kendaraan SET updatedby = '${m_user_id}',
                    nama = '${nama}'
                   WHERE r_kendaraan_id='${id}'`;

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
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM r_kendaraan WHERE r_kendaraan_id='${id}'`;

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
