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
 
   rejectPod: async function(req, res) {
     const {m_user_id,delivery_order_id,reason} = req.body;

     console.log(req.body);
     await DB.poolConnect;
     try {
       const request = DB.pool.request();

       //CEK APAKAH DELIVERY ORDER ID VALID

       let sqlGetDeliveryOrder = `SELECT COUNT(1) AS jumlahData FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
       let getDataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
       let jumlahData =  getDataDeliveryOrder.recordset[0].jumlahData;


       let sqlGetUser = `SELECT COUNT(1) AS jumlahData FROM m_user WHERE m_user_id = '${m_user_id}'`;
       let getDataUser = await request.query(sqlGetUser);
       let jumlahDataUser =  getDataUser.recordset[0].jumlahData;

      //  console.log('jumlahData ',jumlahData);

       if(jumlahData == 0){

          return res.success({
            error : true,
            message: "ID Delivery Order Tidak Valid",
          });

       }else if(jumlahDataUser == 0){

          return res.success({
            error : true,
            message: "User tidak dikenali untuk melakukan proses",
          });

       }else{

        // DO UNTUK DI UPDATE STATUSNYA MENJADI OTW.
        let kode_status = 'OTW';
        let status = 'Proses Pengantaran';
        

        let sqlGetDeliveryOrder = `SELECT mt.m_transporter_id,mt.kode AS kode_transporter,
        do.r_kendaraan_id,do.route,rk.kode AS kode_kendaraan
        FROM delivery_order do,m_transporter_v mt,r_kendaraan rk 
        WHERE do.delivery_order_id = '${delivery_order_id}'
        AND do.m_transporter_id = mt.m_transporter_id
        AND do.r_kendaraan_id = rk.r_kendaraan_id`;

        let getDataDeliveryOrder = await request.query(sqlGetDeliveryOrder);
        let kode_transporter =  getDataDeliveryOrder.recordset.length > 0 ? getDataDeliveryOrder.recordset[0].kode_transporter : null;
        let route =  getDataDeliveryOrder.recordset.length > 0 ? getDataDeliveryOrder.recordset[0].route : null;
        let kode_kendaraan =  getDataDeliveryOrder.recordset.length > 0 ? getDataDeliveryOrder.recordset[0].kode_kendaraan : null;




        if(kode_transporter && route && kode_kendaraan){



                  // AUDIT PROSES REJECT POD KE TABLE AUDIT TRACKING
        let queryAuditTracking = `INSERT INTO audit_tracking
        (createdby, updatedby, delivery_order_id, m_user_id, kode_status, status) VALUES('${m_user_id}',
        '${m_user_id}', '${delivery_order_id}', '${m_user_id}','${kode_status}', '${status}')`;
        await request.query(queryAuditTracking);


          let sqlGetUpdateDeliveryOrder = `UPDATE delivery_order SET kode_status='OTW',
          status='Proses Pengantaran' WHERE delivery_order_id = '${delivery_order_id}'`;
          await request.query(sqlGetUpdateDeliveryOrder);


          // let sqlGetEmailTrasporter = `SELECT email FROM bucket_bidding WHERE kode = '${kode_transporter}' AND rute = '${route}' 
          // AND jenis_kendaraan = '${kode_kendaraan}'`;
          // // console.log(sqlGetEmailTrasporter);
          // let getDataEmail = await request.query(sqlGetEmailTrasporter);
          // let emailTujuan = getDataEmail.recordset.length > 0 ? getDataEmail.recordset[0].email : null;

          let sqlGetEmailTrasporter = `select email_verifikasi from email_team_transport where isactive = 'Y' `;
          // console.log(sqlGetEmailTrasporter);
          let getDataEmail = await request.query(sqlGetEmailTrasporter);
          let emailTujuan = getDataEmail.recordset.length > 0 ? getDataEmail.recordset[0].email_verifikasi : null;

          // INSERT SCHEDULE EMAIL KE TEAM TRANSPORT


          if(emailTujuan){
            // let sqlInsertDataEmail = `INSERT INTO schedule_email_do_reject_pod
            // (delivery_order_id, email_tujuan,reason_reject_pod)
            // VALUES('${delivery_order_id}', '${emailTujuan}','${reason}')`;
            // await request.query(sqlInsertDataEmail);

            for(let i = 0; i< getDataEmail.recordset.length; i++){

              let emailNew = getDataEmail.recordset[i].email_verifikasi
              console.log("emailNew >> ",emailNew);

              let sqlInsertDataEmail = `INSERT INTO schedule_email_do_reject_pod
              (delivery_order_id, email_tujuan,reason_reject_pod)
              VALUES('${delivery_order_id}', '${emailNew}','${reason}')`;
              await request.query(sqlInsertDataEmail);

              console.log("sqlInsertDataEmail ? ",sqlInsertDataEmail);

            }
          }


          return res.success({
            message: "Reject POD Successfully"
          });
        
        }else{

          return res.success({
            error : true,
            message: "Rute,Trasporter dan Jenis Kendaraan tidak valid mohon periksa data POD Terlebih dahulu",
          });

        }
 
      }


       
     } catch (err) {
       return res.error(err);
     }
   }
 };
 
 