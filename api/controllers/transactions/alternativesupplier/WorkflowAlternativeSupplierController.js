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
const moment = require("moment");
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
                               FROM workflow_alternative_supplier ${whereClause}`;
 
       let queryDataTable = `SELECT w.*,d.nama as department  FROM workflow_alternative_supplier w LEFT JOIN r_department d ON d.r_department_id = w.r_department_id ${whereClause}
                             ORDER BY w.created DESC
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
 
       let queryDataTable = `SELECT * FROM workflow_alternative_supplier WHERE workflow_alternative_supplier_id='${req.param(
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


   new: async function(req, res) {
    const {m_user_id,keterangan,tahun,r_department_id,tanggal_berlaku,datauser} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let user = m_user_id ? m_user_id : 'SYSTEM';
      let workflow_alternative_supplier_id = uuid();

      const sql = `INSERT INTO workflow_alternative_supplier
      (workflow_alternative_supplier_id,createdby, updatedby, tahun, keterangan, r_department_id, tanggal_berlaku)
      VALUES('${workflow_alternative_supplier_id}','${user}','${user}', '${tahun}', '${keterangan}', '${r_department_id}', '${tanggal_berlaku}')`;


      console.log(sql);

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }


        for (let i = 0; i < datauser.length; i++) {
            
            let urutan = datauser[i].urutan;
            let username = datauser[i].username;
            let jabatan = datauser[i].jabatan;
            let action = datauser[i].action;
            let kode_status = 'WT'+urutan;


            let insertData = `INSERT INTO workflow_alternative_supplier_detail
            (createdby, updatedby, workflow_alternative_supplier_id, urutan, username, kode_status, jabatan, action)
            VALUES('${user}','${user}','${workflow_alternative_supplier_id}', ${urutan}, '${username}', '${kode_status}', '${jabatan}', '${action}')`;

            await request.query(insertData);
          
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


   // GET ONE RESOURCE
   deleteData: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let workflow_alternative_supplier_id = req.param(
        "id"
      );

      // VALIDASI DELETE DATA
      // CEK APAKAH WORKFLOW SUDAH PERNAH DIPAKAI.
      let sqlCheckWorkflowSudahDigunakanAtauBelum = `SELECT COUNT(1) AS jumlah_data FROM alt_supplier WHERE workflow_alternative_supplier_id = '${workflow_alternative_supplier_id}'`;
      console.log(sqlCheckWorkflowSudahDigunakanAtauBelum);
      let dataCheckWorkflowSudahDigunakanAtauBelum = await request.query(sqlCheckWorkflowSudahDigunakanAtauBelum);
      let jumlahData = dataCheckWorkflowSudahDigunakanAtauBelum.recordset[0].jumlah_data;

      if(jumlahData > 0){
        return res.error({message: "Wofkflow Sudah pernah digunakan, workflow tidak bisa di delete"});
      }else{


        let sqlDeleteDetailWorkflow = `DELETE FROM workflow_alternative_supplier_detail WHERE workflow_alternative_supplier_id = '${workflow_alternative_supplier_id}'`;
        let sqlDeleteHeaderWorkflow = `DELETE FROM workflow_alternative_supplier WHERE workflow_alternative_supplier_id = '${workflow_alternative_supplier_id}'`;
        await request.query(sqlDeleteDetailWorkflow);
        await request.query(sqlDeleteHeaderWorkflow);

        return res.success({
          message: "Delete data successfully"
        });
      
      }

    } catch (err) {
      return res.error(err);
    }
  },

  updateData: async function(req, res) {
    const {m_user_id,id,keterangan,r_department_id,tanggal_berlaku} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let m_user_id_text = m_user_id ? `'${m_user_id}'` : 'NULL';
      let keterangan_text = keterangan ? `'${keterangan}'` : 'NULL';
      let r_department_id_text = r_department_id ? `'${r_department_id}'` : 'NULL';
      let tanggal_berlaku_text = tanggal_berlaku ? `'${tanggal_berlaku}'` : 'NULL';

      let sqlUpdateData = `UPDATE workflow_alternative_supplier 
      SET updatedby=${m_user_id_text},updated=getdate(),keterangan=${keterangan_text},
      r_department_id=${r_department_id_text},
      tanggal_berlaku=${tanggal_berlaku_text} 
      WHERE workflow_alternative_supplier_id = '${id}'`;

      //console.log(sqlUpdateData);
      await request.query(sqlUpdateData);

      return res.success({
        message: "Update Data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
   
}