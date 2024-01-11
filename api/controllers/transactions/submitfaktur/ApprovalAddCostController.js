/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const DBPORTAL = require('./../../../services/DBPORTAL.js');
  
module.exports = {
 
   // GET RESOURCE
  approve: async function(req, res) {
      const {nomor_id,m_user_id} = req.body;
      console.log(req.body);
      await DB.poolConnect;
      try {
        const request = DB.pool.request();

        // PROSES UPDATE DATA STATUS


        let sqlDeleteData = `SELECT delivery_order_add_cost_id FROM delivery_order_add_cost WHERE nomor_id = '${nomor_id}'`;
        let dataDeliveryAddCost = await request.query(sqlDeleteData);
        let delivery_order_add_cost_id = dataDeliveryAddCost.recordset.length > 0 ? dataDeliveryAddCost.recordset[0].delivery_order_add_cost_id : null;


        if(delivery_order_add_cost_id){

          let sqlGetUpdate = `UPDATE delivery_order_add_cost 
          SET kode_status = 'APR',
          status='Approved'
          WHERE nomor_id = '${nomor_id}'`;
          console.log(sqlGetUpdate);
          await request.query(sqlGetUpdate);


          let sqlDataUser = `SELECT nik,nama FROM m_user WHERE m_user_id = '${m_user_id}'`;
          let dataUser = await request.query(sqlDataUser);
    
          // console.log(dataUser);
    
          let nik = dataUser.recordset.length > 0 ? dataUser.recordset[0].nik : null;
          let nama = dataUser.recordset.length > 0 ? dataUser.recordset[0].nama : null;
    
    
          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          
          let namaUser = `'${nama}'`;
          if(getNamaByNik.rows.length > 0){
            namaUser = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          }   


          let insertAudit = `INSERT INTO delivery_order_add_cost_audit
          (createdby, updatedby, delivery_order_add_cost_id, kode_status, status,isemail)
          VALUES(${namaUser},${namaUser}, '${delivery_order_add_cost_id}','APR','Approved','N')`;
          await request.query(insertAudit);

          return res.success({
            message: "Approve data successfully"
          });

        
        }else{

          return res.error({
            message: "Approve data Gagal"
          });

        }
      } catch (err) {
          return res.error(err);
      }
  },
  reject: async function(req, res) {
    const {nomor_id,m_user_id,reason} = req.body;
    console.log(req.body);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      // PROSES UPDATE DATA STATUS

        let sqlDeleteData = `SELECT delivery_order_add_cost_id FROM delivery_order_add_cost WHERE nomor_id = '${nomor_id}'`;
        let dataDeliveryAddCost = await request.query(sqlDeleteData);
        let delivery_order_add_cost_id = dataDeliveryAddCost.recordset.length > 0 ? dataDeliveryAddCost.recordset[0].delivery_order_add_cost_id : null;


        if(delivery_order_add_cost_id){


          let sqlGetUpdate = `UPDATE delivery_order_add_cost SET kode_status = 'RJC',
          status='Reject' WHERE nomor_id = '${nomor_id}'`;
          await request.query(sqlGetUpdate);


          let sqlDataUser = `SELECT nik,nama FROM m_user WHERE m_user_id = '${m_user_id}'`;
          let dataUser = await request.query(sqlDataUser);
    
          // console.log(dataUser);
    
          let nik = dataUser.recordset.length > 0 ? dataUser.recordset[0].nik : null;
          let nama = dataUser.recordset.length > 0 ? dataUser.recordset[0].nama : null;
    
    
          let sqlGetNamaByNik = `SELECT name,email FROM users WHERE nik = '${nik}'`;
          let getNamaByNik = await DBPORTAL.query(sqlGetNamaByNik);
          
          let namaUser = `'${nama}'`;
          if(getNamaByNik.rows.length > 0){
            namaUser = getNamaByNik.rows.length > 0 ? `'${getNamaByNik.rows[0].name}'` : 'NULL';
          }   


          let reasonReject = `NULL`;
          if(reason){
            reasonReject = `'${reason}'`;
          }


          let insertAudit = `INSERT INTO delivery_order_add_cost_audit
          (createdby, updatedby, delivery_order_add_cost_id, kode_status,status,reason,isemail)
          VALUES(${namaUser},${namaUser}, '${delivery_order_add_cost_id}','RJC','Reject',${reasonReject},'N')`;
          await request.query(insertAudit);


          return res.success({
            message: "Approve data successfully"
          });

        
        }else{

          return res.error({
            message: "Approve data Gagal"
          });

        }


    } catch (err) {
        return res.error(err);
    }
    
 },
  
};




function racikXML(xmlTemplate, result) {
  return xmlTemplate.replace('?', result)
}

function padGetReady(d) {
    var str = "" + d
    var pad = "0000000000"
    var ans = pad.substring(0, pad.length - str.length) + str
    return ans;
  }



