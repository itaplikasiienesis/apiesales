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
      query: { currentPage, pageSize, m_user_id,bundle_id}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";


      let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function(item) {
       return item['r_organisasi_id'];
     });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN+= ",'"+datas+"'"
      }
      
      valueIN = valueIN.substring(1)
      

     listOrg = organization.length > 0 ? `AND r_organisasi_id IN (${valueIN})` : "";      

     let filterbudleid = ``;
     if(bundle_id){  

       filterbudleid = `AND bundle_id = '${bundle_id}'`;

     }


     if (bundle_id) {
      filterbudleid = `AND alamat='%${bundle_id}%' AND detail_alamat LIKE '%${bundle_id}%'
      OR nomor_resi LIKE '%${bundle_id}%' OR total_biaya LIKE '%${bundle_id}%'
      OR status LIKE '%${bundle_id}%'
      OR status_dokumen LIKE '%${bundle_id}%'
      OR nomor_do LIKE '%${bundle_id}%'
      OR kendaraan LIKE '%${bundle_id}%'
      OR plat_nomor_kendaraan LIKE '%${bundle_id}%'
      OR nama_driver LIKE '%${bundle_id}%'
      OR nomor_hp_driver LIKE '%${bundle_id}%'
      OR nama_assisten_driver LIKE '%${bundle_id}%'
      OR nomor_hp_assisten_driver LIKE '%${bundle_id}%'
      OR perusahaan_jasa_pengiriman LIKE '%${bundle_id}%'
      OR penerima LIKE '%${bundle_id}%'
      OR region LIKE '%${bundle_id}%'
      OR bundle_id LIKE '%${bundle_id}%'
      OR kota LIKE '%${bundle_id}%'
      OR catatan_pengiriman LIKE '%${bundle_id}%'`;
    }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM contract_v WHERE 1=1 ${listOrg} ${whereClause} ${filterbudleid}`;

      let queryDataTable = `SELECT * FROM contract_v WHERE 1=1 ${listOrg} ${whereClause} ${filterbudleid} 
                            ORDER BY created DESC
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

    
      console.log(queryDataTable);
                            

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);


        for (let i = 0; i < result.recordset.length; i++) {

            let delivery_order_id = result.recordset[i].delivery_order_id;
            let sqlDetail = `SELECT dod.line,mp.kode AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
            CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
            CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi
            FROM delivery_order_detail dod,m_produk mp 
            WHERE dod.delivery_order_id= '${delivery_order_id}'
            AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
            let datadetail = await request.query(sqlDetail);
            rows[i].details = datadetail.recordset;
        }

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

      let queryDataTable = `SELECT * FROM contract_v WHERE c_shipment_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];

        let details = [];
        for (let i = 0; i < result.recordset.length; i++) {

            let delivery_order_id = result.recordset[i].delivery_order_id;
            let sqlDetail = `SELECT dod.line,mp.kode AS kode_barang,mp.nama AS nama_barang,dod.jumlah,
            CAST(dod.jumlah * mp.tonase AS DECIMAL(10,2)) AS tonase,
            CAST(dod.jumlah * mp.kubikasi AS DECIMAL(10,2)) AS kubikasi
            FROM delivery_order_detail dod,m_produk mp 
            WHERE dod.delivery_order_id= '${delivery_order_id}'
            AND dod.m_produk_id=mp.m_produk_id ORDER BY dod.line`;
            let datadetail = await request.query(sqlDetail);
            details.push(datadetail.recordset)
            
        }

        row.details = details[0];

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  assignDriver: async function(req, res) {
    const {m_user_id,delivery_order_id,nama_driver,nomor_hp_driver,nama_assisten_driver,nomor_hp_assisten_driver,plat_nomor_kendaraan} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE delivery_order
      SET updatedby='${m_user_id}',updated=getdate(),
      nama_driver='${nama_driver}', 
      nomor_hp_driver='${nomor_hp_driver}', 
      nama_assisten_driver='${nama_assisten_driver}', 
      nomor_hp_assisten_driver='${nomor_hp_assisten_driver}', 
      plat_nomor_kendaraan='${plat_nomor_kendaraan}'
      WHERE delivery_order_id='${delivery_order_id}'`;

      request.query(sql, (err, result) => {
        if (err) {
          return res.error(err);
        }
        
        return res.success({
          data: result,
          message: "Assign Driver Successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};

