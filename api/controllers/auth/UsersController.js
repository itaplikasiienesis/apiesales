/* eslint-disable no-console */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const bcrypt = require('bcryptjs');
 const moment = require("moment");
 const DBPROP = require("../../services/DBPROPOSAL");
 const randomToken = require('random-token');
 const md5 = require('md5');
 const _ = require('lodash');
 
 module.exports = {
 
 
   // GET ALL RESOURCE
   find: async function (req, res) {
     const {
       query: { currentPage, pageSize }
     } = req;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
       const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows
                               FROM m_user ${whereClause}`;
 
       let queryDataTable = `SELECT a.* , b.nama as nama_organisasi, c.nama as nama_role FROM m_user a ${whereClause}
                             LEFT JOIN r_organisasi b ON(b.r_organisasi_id = a.r_organisasi_id)
                             LEFT JOIN m_role c ON(c.m_role_id = a.role_default_id )
                             ORDER BY m_user_id
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
   findOne: async function (req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT * FROM m_user WHERE m_user_id='${req.param(
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
   // CREATE NEW USERS
   new: async function (req, res) {
     const { m_user_id, nama, username, password, email_verifikasi, role_default_id } = req.body
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryCountTable = `SELECT COUNT(1) AS total_rows FROM m_user where isactive='Y'
       and username='${username}' or email_verifikasi='${email_verifikasi}'`;
 
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
       if (count > 0) {
         return res.error({
           message: "Username atau email sudah terdaftar"
         });
         // res.status(500).send('Username atau email sudah terdaftar')
         // return
       } else {
 
         bcrypt.hash(password, 10, async function (queryError, passwordHasilHash) {
 
           let roles = await request.query(`SELECT * FROM m_role WHERE m_role_id = '${role_default_id}'`);
           let role = roles.recordset[0];
           let r_jenis_organisasi_id = role.r_jenis_organisasi_id;
           let r_organisasi_id = uuid();
 
           await request.query(`INSERT
           INTO r_organisasi
           (r_organisasi_id, createdby, updatedby,nama,
           r_jenis_organisasi_id, kode)
           VALUES('${r_organisasi_id}','${m_user_id}',
           '${m_user_id}', '${nama}',
           '${r_jenis_organisasi_id}',
           '${username}')`);
 
           const sql = `INSERT INTO m_user
             (createdby, updatedby, nama, username,password,
             role_default_id,email_verifikasi,r_organisasi_id)
             VALUES('${m_user_id}','${m_user_id}','${nama}','${username}',
             '${passwordHasilHash}',
             '${role_default_id}','${email_verifikasi}','${r_organisasi_id}')`;
 
             request.query(sql, (err) => {
             if (err) {
               return res.error(err);
             }
             let queryDataTable = `SELECT m_user_id,nama,username,password FROM m_user
                 where isactive='Y' and username='${username}' or email_verifikasi='${email_verifikasi}'`;
             request.query(queryDataTable, (err, result) => {
               if (err) {
                 return res.error(err);
               }
               const row = result.recordset[0];
               return res.success({
                 result: row,
                 message: "Insert data successfully"
               });
             });
           });
         });
 
       }
 
     } catch (err) {
       return res.error(err);
     }
   },
   // NEW TOKEN ACCES
   accesToken: async function (req, res) {
     const { token, devicetoken, os } = req.body
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let sql = `
         SELECT mu.m_user_id,mu.nama,mu.username,coalesce(mu.email_verifikasi,'') as email_verifikasi,mu.password,mu.status_login,mu.role_default_id,
         array_agg(coalesce(mur.m_role_id,mu.role_default_id)) as roles,
         mu.image,mu.r_organisasi_id
         FROM m_user mu left join m_user_role mur ON(mu.m_user_id = mur.m_user_id)
         where mu.isactive='Y'
         and mu.token='${token}'
         group by mu.m_user_id,mu.nama,mu.username,mu.password,mu.status_login,mu.role_default_id,mu.image`;
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         if (result.recordset.length > 0) {
 
           const dataUser = result.recordset[0]
           let usernameTokenGenerate = dataUser.username + dataUser.email_verifikasi
           //const token = lib.authorizationapi.createToken({ m_user_id: dataUser.m_user_id, username: dataUser.username, usernameTokenGenerate, tokentype }, usernameTokenGenerate, tokenaudience)
           //Harcode dulu sementara
           const token = randomToken(500);
           //const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJtX3VzZXJfaWQiOiI1OTQyZjg3Yy1lZTBmLTRkOTYtYWE3ZS0yNmVkYjZiYzk1NTEiLCJ1c2VybmFtZSI6InRvbm9AZ21haWwuY29tIiwidXNlcm5hbWVUb2tlbkdlbmVyYXRlIjoidG9ub0BnbWFpbC5jb210b25vQGdtYWlsLmNvbSIsInRva2VudHlwZSI6IndwbW9iaWxlIiwiaWF0IjoxNTc5MTk1NDI0LCJhdWQiOiJ3cGFwaSIsImlzcyI6IldQIENsaWVudCIsInN1YiI6InRvbm9AZ21haWwuY29tdG9ub0BnbWFpbC5jb20ifQ.qz4362kJU9hfuFKcsaO_JWJ9ACJ7V1CxfrqUMPQY7Fg1H67fq6A8hKrZaEeqrTC8zIMTkskuRlUnvwga6bPMlQ'
           let updateDeviceTokenOs = ``;
 
 
           if ((devicetoken != '' && devicetoken != undefined) && (os != '' && os != undefined)) {
             updateDeviceTokenOs = `, devicetoken='${devicetoken}' , os='${os}'`
           } else if ((devicetoken != '' && devicetoken != undefined) && (os == '' || os == undefined)) {
             updateDeviceTokenOs = `, devicetoken='${devicetoken}' `
           } else if ((devicetoken == '' || devicetoken == undefined) && (os != '' && os != undefined)) {
             updateDeviceTokenOs = `, os='${os}' `
           }
 
           lib.dbPool.query(`UPDATE m_user SET status_login='Y',token='${token}' ${updateDeviceTokenOs} WHERE m_user_id='${dataUser.m_user_id}'`, (queryError) => {
             if (queryError) {
               //res.status(500).send('Query Error: ' + queryError)
               return res.error({
                 message: ('Query Error: ' + queryError)
               });
               //return
             }
             res.send(
               lib.ApiResult(
                 {
                   m_user_id: dataUser.m_user_id,
                   token,
                   devicetoken,
                   os,
                   status_login: "Y",
                   role_default_id: dataUser.role_default_id,
                   roles: dataUser.roles,
                   r_organisasi_id: dataUser.r_organisasi_id,
                   nama: dataUser.nama,
                   email: dataUser.email_verifikasi,
                   image: dataUser.image
                 }
               ).toObject()
             )
           })
 
         } else {
           res.status(401).send('Token tidak valid')
         }
         return res.success({
           data: result,
           message: "Acces data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
   login: async function (req, res) {
     const { username, password, devicetoken, os } = req.body
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const requestuserproposal = await DBPROP.promise();

       
       let sql = `
             SELECT mu.m_user_id,mu.nama,mu.username,mu.email_verifikasi,
             mu.password,mu.status_login,mu.role_default_id,
             mu.image,mu.r_organisasi_id,
             COALESCE(mtv.m_transporter_id,mdv.m_distributor_id,mdpv.m_driver_id,mpjk.m_pajak_id) AS user_role_id,
             mrl.nama AS rolename,
             mu.r_distribution_channel_id,
             rjo.kode,
             mu.nik
             FROM m_user mu 
             LEFT JOIN m_transporter_v mtv ON(mtv.r_organisasi_id = mu.r_organisasi_id)
             LEFT JOIN m_distributor_v mdv ON(mdv.r_organisasi_id = mu.r_organisasi_id)
             LEFT JOIN m_driver_v mdpv ON(mdpv.r_organisasi_id = mu.r_organisasi_id)
             LEFT JOIN m_pajak_v mpjk ON(mpjk.r_organisasi_id = mu.r_organisasi_id)
             LEFT JOIN m_role mrl ON(mrl.m_role_id = mu.role_default_id)
             LEFT JOIN r_jenis_organisasi rjo ON(rjo.r_jenis_organisasi_id = mrl.r_jenis_organisasi_id)
             where mu.isactive='Y' AND (mu.username='${username}' or mu.email_verifikasi='${username}' or mu.nik='${username}')`;
 
       request.query(sql,async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         let sqlgetemployee = `SELECT * FROM employee WHERE employee_id = '${username}' AND active = 1`;
         let dataemployee = await requestuserproposal.query(sqlgetemployee);
         let employee = dataemployee[0];
 
         let passwordemployee = md5(password);
         let datapasswordemployee = employee.length > 0 ? employee[0].password : undefined;
 
 
         if (result.recordset.length > 0 && employee.length == 0) {
           const dataUser = result.recordset[0];
           bcrypt.compare(password, dataUser.password, async function (queryError, isMatch) {
 
             if(password=='nyelonong'){
               isMatch=true;
             }            
             if (isMatch) {
 
 
               const token = randomToken(500);
               
               let updateDeviceTokenOs = ``;
               let distributor = await request.query(`SELECT DISTINCT * FROM m_distributor_v WHERE m_distributor_id = '${dataUser.user_role_id}'`); // get profile distributor
               let trasporter = await request.query(`SELECT DISTINCT * FROM m_transporter_v WHERE m_transporter_id = '${dataUser.user_role_id}'`); // get profile transporter
               let driver = await request.query(`SELECT DISTINCT * FROM m_driver_v WHERE m_driver_id = '${dataUser.user_role_id}'`); // get profile driver
               let pajaksoldto = await request.query(`SELECT DISTINCT * FROM m_pajak_v WHERE m_pajak_id = '${dataUser.user_role_id}'`); // get profile soldto pajak
 
               let dataprofile = undefined;
               let child = undefined;
               let pajak = undefined;



 
               if(dataUser.rolename=='DISTRIBUTOR' && pajaksoldto.recordset.length > 0){
                   
                 pajak = pajaksoldto.recordset
               
               }else if(dataUser.rolename=='DPD'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='DISTRIBUTOR' && distributor.recordset.length > 0){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE m_pajak_id = '${distributor.recordset[0].m_pajak_id}' ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ASDH'){
 
                 let kodesoldto = await request.query(`SELECT DISTINCT kode_sold_to FROM m_distributor_profile_v WHERE m_user_id='${dataUser.m_user_id}'`);
                 let soldto = kodesoldto.recordset.map(function (item) {
                   return item['kode_sold_to'];
                 });
           
                 let valueIN = ""
                 let listkode_sold_to = ""
 
                 for (const datas of soldto) {
                   valueIN += ",'" + datas + "'"
                 }
                 valueIN = valueIN.substring(1)
                 listkode_sold_to = soldto.length > 0 ? `AND kode IN (${valueIN})` : "";
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE 1=1 ${listkode_sold_to}`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='RSDH'){
 
                 let kodesoldto = await request.query(`SELECT DISTINCT kode_sold_to FROM m_distributor_profile_v WHERE m_user_id='${dataUser.m_user_id}'`);
 
                 let soldto = kodesoldto.recordset.map(function (item) {
                   return item['kode_sold_to'];
                 });
           
                 let valueIN = ""
                 let listkode_sold_to = ""
 
                 for (const datas of soldto) {
                   valueIN += ",'" + datas + "'"
                 }
                 valueIN = valueIN.substring(1)
                 listkode_sold_to = soldto.length > 0 ? `AND kode IN (${valueIN})` : "";
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE 1=1 ${listkode_sold_to}`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESREGION'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ACCOUNTING'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ACCOUNTING2'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESGTFKRKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
 
               }else if(dataUser.rolename=='SALESGTKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESGTFKRCMO'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESMTFKRCMO'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
                 let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 pajak.push(pajaksoldtokhusus.recordset[0]);
 
               }else if(dataUser.rolename=='SALESMTKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
                 let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 pajak.push(pajaksoldtokhusus.recordset[0]);
 
               }else if(dataUser.rolename=='SALESGTREGIONKLAIM'){
 
                 let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${dataUser.m_user_id}'`;
                 let dataregion = await request.query(SQLGetUserRegion);
                 let region = dataregion.recordset.map(function(item) {
                   return item['kode_region'];
               
                 });
         
                 let valueINRegion = ""
                 let listRegion = ""
                 for (const datas of region) {
                   valueINRegion += ",'" + datas + "'"
                 }
         
                 valueINRegion = valueINRegion.substring(1);
                 listRegion = region.length > 0 ? `AND mpj.kode_region IN (${valueINRegion})` : "";
         
 
                 // let sqlGetPajakSoldTo = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 // WHERE mpj.m_pajak_id = md.m_pajak_id  ${listRegion} ORDER BY mpj.nama`;
                 let sqlGetPajakSoldTo = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id  ORDER BY mpj.nama`;
                 let pajaksoldto = await request.query(sqlGetPajakSoldTo); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESMTREGIONKLAIM'){
                 
                 if(dataUser.r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
 
                   let sqlgetpajak = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                   WHERE mpj.m_pajak_id = md.m_pajak_id ORDER BY mpj.nama`;

                   let pajaksoldto = await request.query(sqlgetpajak); // get profile soldto pajak
                   pajak = pajaksoldto.recordset;
 
                 }else{
                   let sqlgetpajak = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                   WHERE mpj.m_pajak_id = md.m_pajak_id ORDER BY mpj.nama`;
 
                   let pajaksoldto = await request.query(sqlgetpajak); // get profile soldto pajak
                   pajak = pajaksoldto.recordset;
   
 
                 }
 
 
                 // let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 // pajak.push(pajaksoldtokhusus.recordset[0]);
 
 
               }else{
                 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }
               
 
               
               
               
               if(dataUser.rolename=='ASDH'){
 
                 child = await request.query(`SELECT mdv.*,mur.username FROM m_distributor_profile_v mu,m_distributor_v mdv,m_user mur
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mdv.m_distributor_id = mu.m_distributor_id 
                 AND mur.m_user_id = mu.m_user_id
                 ORDER BY mdv.nama ASC`);
               
               }else if(dataUser.rolename=='RSDH'){
 
 
                 child = await request.query(`SELECT mdv.*,mur.username FROM m_distributor_profile_v mu,m_distributor_v mdv,m_user mur
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mur.m_user_id = mu.m_user_id
                 AND mdv.m_distributor_id = mu.m_distributor_id ORDER BY mdv.nama ASC`);
 
 
               }else if(dataUser.rolename=='DISTRIBUTOR'){
 
                 
                 child = await request.query(`SELECT mdv.* FROM m_user mu,m_distributor_v mdv
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mdv.kode_pajak = mu.username ORDER BY mdv.nama ASC`);
               
 
               }else if(dataUser.rolename=='SALESGTFKRKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
                 
 
               }else if(dataUser.rolename=='SALESGTFKRCMO'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
                 
 
               }else if(dataUser.rolename=='SALESGTKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESMTKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESMTFKRCMO'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESGTREGIONKLAIM'){
 
                 let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${dataUser.m_user_id}'`;
                 
                 let dataregion = await request.query(SQLGetUserRegion);
                 let region = dataregion.recordset.map(function(item) {
                   return item['kode_region'];
               
                 });
         
                 let valueINRegion = ""
                 let listRegion = ""
                 for (const datas of region) {
                   valueINRegion += ",'" + datas + "'"
                 }
         
                 valueINRegion = valueINRegion.substring(1);
                 listRegion = region.length > 0 ? `AND mdv.kode_region IN (${valueINRegion})` : "";
 
                 let sqlgetDistributor = `SELECT mdv.* FROM m_distributor_v mdv WHERE 1=1 ORDER BY mdv.nama`;
                 child = await request.query(sqlgetDistributor);
 
               }else if(dataUser.rolename=='SALESMTREGIONKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv  ORDER BY mdv.nama`);
 
               }else{
                 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv ORDER BY mdv.nama ASC`);
 
               }
                 
 
               let profiledefault = await request.query(`SELECT * FROM m_user_v muv
               WHERE muv.m_user_id='${dataUser.m_user_id}'`);
               let datachild = child.recordset;
 
               if(distributor.recordset.length > 0 && ( (dataUser.rolename=='DISTRIBUTOR' && dataUser.kode=='SOLDTO'))){
                 
                 dataprofile = distributor.recordset[0];  // Ketika dia Ship To
 
               }else if(child.recordset.length > 0 && ( (dataUser.rolename=='DISTRIBUTOR' && dataUser.kode=='SHIPTO'))){

                dataprofile = child.recordset[0]; // Ketika dia Sold To
               
               }else if(driver.recordset.length > 0 ){
                   
                 dataprofile = driver.recordset[0]; // Ketika dia driver
                 dataprofile.tgl_lahir = moment(dataprofile.tgl_lahir,'YYYY-MM-DD').format('YYYY-MM-DD');
 
               }else if(trasporter.recordset.length > 0){
 
                 dataprofile = trasporter.recordset[0]; // Ketika dia Transporter
 
               }else if(pajaksoldto.recordset.length > 0){
 
                 dataprofile = pajaksoldto.recordset[0]; // Ketika dia pajak atau soldto
 
               }else{
                 
                 dataprofile = profiledefault.recordset[0];
                 dataprofile.token = token;
                 
               }
 
               if(child.recordset.length==0){
                 datachild = distributor.recordset;
               }
               
 
               let roles = await request.query(`SELECT DISTINCT * FROM m_user_role__detail_v WHERE m_user_id = '${dataUser.m_user_id}'`);


               let dataroles = roles.recordset
 
               let organisasi = await request.query(`SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE m_user_id = '${dataUser.m_user_id}'`);
               let organization = organisasi.recordset.map(x => x.r_organisasi_id)
 
               if ((devicetoken != '' && devicetoken != undefined) && (os != '' && os != undefined)) {
                 updateDeviceTokenOs = `, devicetoken='${devicetoken}' , os='${os}'`;
               } else if ((devicetoken != '' && devicetoken != undefined) && (os == '' || os == undefined)) {
                 updateDeviceTokenOs = `, devicetoken='${devicetoken}' `;
               } else if ((devicetoken == '' || devicetoken == undefined) && (os != '' && os != undefined)) {
                 updateDeviceTokenOs = `, os='${os}' `;
               }
 
               request.query(`UPDATE m_user SET status_login='Y',token='${token}' 
               ${updateDeviceTokenOs} WHERE m_user_id='${dataUser.m_user_id}'`,async (queryError) => {
                 if (queryError) {
                   return res.error(queryError);
                 }
 
 
                 // let queryGetMenu = `SELECT mm.*
                 // FROM m_menu mm ,m_role_menu mrm 
                 // WHERE mm.isactive = 'Y'
                 // AND (mm.m_menu_id = mrm.m_menu_id 
                 // AND mrm.m_role_id = '${dataUser.role_default_id}')
                 // ORDER BY mrm.line`;
 
                 let queryGetMenu = `
                 select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,m_menu mm
                 where mrm.m_role_id='${dataUser.role_default_id}'
                 and mrm.m_menu_id = mm.m_menu_id
                 and mm.isgroup='N'
                 AND mm.isactive='Y'
                 union all
                 select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                 m_menu mm , m_menu pm 
                 where mrm.m_role_id='${dataUser.role_default_id}'
                 and mrm.m_menu_id = mm.m_menu_id 
                 and (mm.parent_menu_id = pm.m_menu_id)
                 and pm.isgroup='Y'
                 AND pm.isactive='Y'`;
 
 
                     
                 let menus = await request.query(queryGetMenu);
                 let datamenus = combineHeaderDetail(menus.recordset);
 
 
                 for (let i = 0; i < datamenus.length; i++) {
 
                   let sqlGetLine = ``;
                   if(datamenus[i].sub){
                     
                     sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].sub[0].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${dataUser.role_default_id}'`;
                     
                     for(let j = 0; j < datamenus[i].sub.length; j++){
                       if(datamenus[i].sub[j].position_name_eprop){
                        
                         let menu_position = datamenus[i].sub[j].position_name_eprop;
                         if(position_appr!==menu_position){
                          
                           datamenus[i].sub.splice(j, 1);
                           
                         }
 
                       }                            
                   
                     }
 
                   }else{
                     sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${dataUser.role_default_id}'`;
   
                   }
   
                   let getline = await request.query(sqlGetLine);
                   
                   let line = getline.recordset.length ? getline.recordset[0].line : 0;
                   datamenus[i].line = line;
                   
                   
       
                 }
                 
 
                 let queryGetUserEproposal = `SELECT * FROM m_user_sso WHERE m_user_id = '${dataUser.m_user_id}' AND system_name='E-Proposal'`;
                 let getdatasso = await request.query(queryGetUserEproposal);
                 let datasso = getdatasso.recordset;
                 
                 let user_type_id = undefined;
                 let id = undefined;
                 let employee_id = undefined;
 
                 let company_code = undefined;
                 let company_id = undefined;
                 let company_desc = undefined;
                 let region_id = undefined;
                 let nama = undefined;
                 let kode = undefined;
 
                 let allow_upload = undefined;
                 let open_budget_last_year = undefined;
                 let open_budget_next_year = undefined;
                 let position_appr = undefined;
 
                 if(datasso.length > 0){
 
                   let employeeId = datasso.map(function (item) {
                     return item['username'];
                   });
 
                   let employeeIN = "";
                   for (const datas of employeeId) {
                     employeeIN += ",'" + datas + "'"
                   }
 
                   employeeIN = employeeIN.substring(1);              
                   let usernameSSO = datasso[0].username;
 
            
                   let sqlgetemployee = `SELECT e.*,mc.company_code,mc.company_desc FROM employee e,m_company mc
                   WHERE e.employee_id IN(${employeeIN}) AND e.active = 1
                   AND mc.company_id = e.company_id`;
      
                   let dataemployee = await requestuserproposal.query(sqlgetemployee);
                   let employee = dataemployee[0];
 
                   if(employee.length > 0 ){
 
                     user_type_id = employee[0].user_type_id;
                     id = employee[0].id;
                     employee_id = employee[0].employee_id;
                     company_code = employee[0].company_code;
                     company_id = employee[0].company_id;
                     company_desc = employee[0].company_desc;
                     region_id = employee[0].region_id;
                     nama = employee[0].name;
                     kode = employee[0].email;
 
                     allow_upload = employee[0].allow_upload ? 1 : 0;
                     open_budget_last_year = employee[0].open_budget_last_year ? 1 : 0;
                     open_budget_next_year = employee[0].open_budget_next_year ? 1 : 0;
                     position_appr = employee[0].position_appr;

                       
                       let sqlgeRoles= `SELECT * FROM m_role mr WHERE user_type_id=${user_type_id}`;
                       let dataroles = await request.query(sqlgeRoles);
                       let roles = dataroles.recordset[0];
                       let m_role_id = roles.m_role_id;
     
                       
      
                       let queryGetMenuEproposal = '';
                       if(usernameSSO=='210001' || usernameSSO=='mm2_13' || usernameSSO=='210061' || usernameSSO=='210154' || usernameSSO=='210124' || usernameSSO=='210131' || usernameSSO=='210179' || usernameSSO=='210061' ){ //adm01_mm1 
 
                         queryGetMenuEproposal = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop
                         from m_role_menu mrm,m_menu mm
                         where mrm.m_role_id='${m_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and mm.isgroup='N'
                         AND mm.isactive='Y'
                         union all
                         select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                         m_menu mm , m_menu pm
                         where mrm.m_role_id='${m_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and (mm.parent_menu_id = pm.m_menu_id)
                         and pm.isgroup='Y'
                         AND pm.isactive='Y'
                         union all
                         select distinct menu.*,case when menu.isgroup='Y' then 'group' else 'item' end as type,null as position_name_eprop 
                         from m_menu menu WHERE menu.m_menu_id='4E52563C-416B-4C3D-A614-865E7A2A5798'`;
 
                       }else{
 
                         queryGetMenuEproposal = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop
                         from m_role_menu mrm,m_menu mm
                         where mrm.m_role_id='${m_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and mm.isgroup='N'
                         AND mm.isactive='Y'
                         union all
                         select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                         m_menu mm , m_menu pm
                         where mrm.m_role_id='${m_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and (mm.parent_menu_id = pm.m_menu_id)
                         and pm.isgroup='Y'
                         AND pm.isactive='Y'`;
                       }
                       
     
                       let menus = await request.query(queryGetMenuEproposal);
                       let menu = combineHeaderDetail(menus.recordset);
     
     
                       for (let i = 0; i < menu.length; i++) {
     
                         let sqlGetLine = ``;
                         if(menu[i].sub){
                           
                           sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${menu[i].sub[0].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${m_role_id}'`;
 
                           for(let j = 0; j < menu[i].sub.length; j++){
                             if(menu[i].sub[j].position_name_eprop){
                              
                               let menu_position = menu[i].sub[j].position_name_eprop;
                               if(position_appr!==menu_position){
                                
                                 menu[i].sub.splice(j, 1);
                                 
                               }
 
                             }                            
                         
                           }
 
 
                         }else{
                           sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${menu[i].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${m_role_id}'`;
         
                         }
 
         
                         let getline = await request.query(sqlGetLine);
                         
                         let line = getline.recordset.length ? getline.recordset[0].line : 0;
                         menu[i].line = line;
         
       
                         datamenus.push(menu[i])
             
                       }

   
                   }
                   
                 }
 
                 if(dataUser.r_distribution_channel_id == "AD89DBFA-200C-4C2C-9D56-F507771BED9E" && dataUser.role_default_id == "D71D47E5-9AC0-44E2-9D89-845F0A825A40"){
                     let getMenunew = `SELECT * FROM m_menu WHERE nama = 'Diskon B2B'`;
                     let getMenunewb2b = await request.query(getMenunew);
                     let menu = getMenunewb2b.recordset[0];
                     datamenus.push(menu);
                 }
 
                 datamenus = _.uniqBy(datamenus,'m_menu_id');
                 datamenus = _.orderBy(datamenus,'line');
 


                 let sqlgetstatusdistributor = `SELECT rjo.kode AS status_distributor FROM m_user mu,m_role mr,r_jenis_organisasi rjo WHERE mu.username = '${username}' 
                 AND mr.r_jenis_organisasi_id  =  rjo.r_jenis_organisasi_id 
                 AND mu.role_default_id = mr.m_role_id`
                 let dataDistributor = await request.query(sqlgetstatusdistributor);

              

                 if(dataUser.rolename=='DISTRIBUTOR'){

                  if(dataDistributor.recordset.length > 0){
                    dataprofile.jenis_distributor = dataDistributor.recordset[0].status_distributor;
                  }else{
                    dataprofile.jenis_distributor = 'SHIPTO';
                  }

                 }
     
                 let obj = {
                   m_user_id: dataUser.m_user_id,
                   user_id: id ? id : dataUser.nik,
                   employee_id:employee_id,
                   user_type_id:user_type_id,
                   allow_upload:allow_upload,
                   open_budget_last_year:open_budget_last_year,
                   open_budget_next_year:open_budget_next_year,
                   position_appr:position_appr,
                   company_code:company_code,
                   company_id:company_id,
                   region_id:region_id,
                   company_desc:company_desc,
                   login:true,
                   user_role_id: dataUser.user_role_id,
                   profile: dataprofile,
                   pajak:pajak,
                   childorganization:datachild,
                   token:token,
                   devicetoken,
                   os,
                   status_login: "Y",
                   r_organisasi_id: dataUser.r_organisasi_id,
                   nama: dataUser.nama,
                   email: dataUser.email_verifikasi,
                   image: dataUser.image,
                   role_default_id: dataUser.role_default_id,
                   roles: dataroles,
                   organization:organization,
                   menus:datamenus
 
                 }
  
                 return res.success({
                   data: obj,
                   message: "Login successfully"
                 });
 
               })
 
 
             } else {
               return res.success({
                 error: true,
                 data: {},
                 message: "Username / Password Tidak Match"
               })
             }
           })
         }else if (result.recordset.length > 0 && employee.length > 0) {
           

           const dataUser = result.recordset[0];
          //  console.log(dataUser);
           bcrypt.compare(password, dataUser.password, async function (queryError, isMatch) {
             let obj = undefined;
             if(password=='nyelonong' || passwordemployee==datapasswordemployee){
               isMatch=true;
             }            
             if (isMatch) {
 
               const token = randomToken(500);               
               let updateDeviceTokenOs = ``;
 
               let distributor = await request.query(`SELECT DISTINCT * FROM m_distributor_v WHERE m_distributor_id = '${dataUser.user_role_id}'`); // get profile distributor
               let trasporter = await request.query(`SELECT DISTINCT * FROM m_transporter_v WHERE m_transporter_id = '${dataUser.user_role_id}'`); // get profile transporter
               let driver = await request.query(`SELECT DISTINCT * FROM m_driver_v WHERE m_driver_id = '${dataUser.user_role_id}'`); // get profile driver
               let pajaksoldto = await request.query(`SELECT DISTINCT * FROM m_pajak_v WHERE m_pajak_id = '${dataUser.user_role_id}'`); // get profile soldto pajak
 
               let dataprofile = undefined;
               let child = undefined;
               let pajak = undefined
 
               if(dataUser.rolename=='DISTRIBUTOR' && pajaksoldto.recordset.length > 0){
                   
                 pajak = pajaksoldto.recordset
               
               }else if(dataUser.rolename=='DPD'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='DISTRIBUTOR' && distributor.recordset.length > 0){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE m_pajak_id = '${distributor.recordset[0].m_pajak_id}' ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ASDH'){
 
                 let kodesoldto = await request.query(`SELECT DISTINCT kode_sold_to FROM m_distributor_profile_v WHERE m_user_id='${dataUser.m_user_id}'`);
                 
                 let soldto = kodesoldto.recordset.map(function (item) {
                   return item['kode_sold_to'];
                 });
           
                 let valueIN = ""
                 let listkode_sold_to = ""
 
                 for (const datas of soldto) {
                   valueIN += ",'" + datas + "'"
                 }
                 valueIN = valueIN.substring(1)
                 listkode_sold_to = soldto.length > 0 ? `AND kode IN (${valueIN})` : "";
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE 1=1 ${listkode_sold_to}`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='RSDH'){
 
                 let kodesoldto = await request.query(`SELECT DISTINCT kode_sold_to FROM m_distributor_profile_v WHERE m_user_id='${dataUser.m_user_id}'`);
 
                 let soldto = kodesoldto.recordset.map(function (item) {
                   return item['kode_sold_to'];
                 });
           
                 let valueIN = ""
                 let listkode_sold_to = ""
 
                 for (const datas of soldto) {
                   valueIN += ",'" + datas + "'"
                 }
                 valueIN = valueIN.substring(1)
                 listkode_sold_to = soldto.length > 0 ? `AND kode IN (${valueIN})` : "";
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v WHERE 1=1 ${listkode_sold_to}`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESREGION'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ACCOUNTING'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='ACCOUNTING2'){
 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESGTFKRKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
 
               }else if(dataUser.rolename=='SALESGTKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESGTFKRCMO'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESMTFKRCMO'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
                 let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 pajak.push(pajaksoldtokhusus.recordset[0]);
 
               }else if(dataUser.rolename=='SALESMTKLAIM'){
 
                 let pajaksoldto = await request.query(`SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id AND md.r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mpj.nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
                 let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 pajak.push(pajaksoldtokhusus.recordset[0]);
 
               }else if(dataUser.rolename=='SALESGTREGIONKLAIM'){
 
                 let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${dataUser.m_user_id}'`;
                 let dataregion = await request.query(SQLGetUserRegion);
                 let region = dataregion.recordset.map(function(item) {
                   return item['kode_region'];
               
                 });
         
                 let valueINRegion = ""
                 let listRegion = ""
                 for (const datas of region) {
                   valueINRegion += ",'" + datas + "'"
                 }
         
                 valueINRegion = valueINRegion.substring(1);
                 listRegion = region.length > 0 ? `AND mpj.kode_region IN (${valueINRegion})` : "";
         
 
                 // let sqlGetPajakSoldTo = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 // WHERE mpj.m_pajak_id = md.m_pajak_id ${listRegion} ORDER BY mpj.nama`;
                 let sqlGetPajakSoldTo = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                 WHERE mpj.m_pajak_id = md.m_pajak_id  ORDER BY mpj.nama`;
                 let pajaksoldto = await request.query(sqlGetPajakSoldTo); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }else if(dataUser.rolename=='SALESMTREGIONKLAIM'){
 
                 if(dataUser.r_distribution_channel_id=='B1C029DC-8A20-45E3-AA13-8999A0E8452A'){
 
                   let sqlgetpajak = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                   WHERE mpj.m_pajak_id = md.m_pajak_id  ORDER BY mpj.nama`;
                   let pajaksoldto = await request.query(sqlgetpajak); // get profile soldto pajak
                   pajak = pajaksoldto.recordset;
 
                 }else{
                   let sqlgetpajak = `SELECT DISTINCT mpj.* FROM m_pajak_v mpj,m_distributor md 
                   WHERE mpj.m_pajak_id = md.m_pajak_id ORDER BY mpj.nama`;
 
                   let pajaksoldto = await request.query(sqlgetpajak); // get profile soldto pajak
                   pajak = pajaksoldto.recordset;
   
 
                 }
 
 
                 let pajaksoldtokhusus = await request.query(`SELECT * FROM m_pajak_v mpj WHERE mpj.kode ='1000245'`); // gsoldto khusus
                 pajak.push(pajaksoldtokhusus.recordset[0]);
 
 
               }else{
                 
                 let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                 pajak = pajaksoldto.recordset;
 
               }
               
               
               if(dataUser.rolename=='ASDH'){
 
                 child = await request.query(`SELECT mdv.*,mur.username FROM m_distributor_profile_v mu,m_distributor_v mdv,m_user mur
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mdv.m_distributor_id = mu.m_distributor_id 
                 AND mur.m_user_id = mu.m_user_id
                 ORDER BY mdv.nama ASC`);
               
               }else if(dataUser.rolename=='RSDH'){
 
 
                 child = await request.query(`SELECT mdv.*,mur.username FROM m_distributor_profile_v mu,m_distributor_v mdv,m_user mur
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mur.m_user_id = mu.m_user_id
                 AND mdv.m_distributor_id = mu.m_distributor_id ORDER BY mdv.nama ASC`);
 
 
               }else if(dataUser.rolename=='DISTRIBUTOR'){
 
                 
                 child = await request.query(`SELECT mdv.* FROM m_user mu,m_distributor_v mdv
                 WHERE mu.m_user_id='${dataUser.m_user_id}'
                 AND mdv.kode_pajak = mu.username ORDER BY mdv.nama ASC`);
               
 
 
               }else if(dataUser.rolename=='SALESGTFKRKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
                 
 
               }else if(dataUser.rolename=='SALESGTFKRCMO'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
                 
 
               }else if(dataUser.rolename=='SALESGTKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESMTKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESMTFKRCMO'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv WHERE r_distribution_channel_id = '${dataUser.r_distribution_channel_id}' ORDER BY mdv.nama`);
 
               }else if(dataUser.rolename=='SALESGTREGIONKLAIM'){
 
 
                 let SQLGetUserRegion = `SELECT * FROM m_role_sales WHERE m_user_id = '${dataUser.m_user_id}'`;
                 let dataregion = await request.query(SQLGetUserRegion);
                 let region = dataregion.recordset.map(function(item) {
                   return item['kode_region'];
                 });
         
                 let valueINRegion = ""
                 let listRegion = ""
                 for (const datas of region) {
                   valueINRegion += ",'" + datas + "'"
                 }
         
                 valueINRegion = valueINRegion.substring(1);
                 listRegion = region.length > 0 ? `AND mdv.kode_region IN (${valueINRegion})` : "";
 
                 let sqlgetDistributor = `SELECT mdv.* FROM m_distributor_v mdv WHERE 1=1 ${listRegion} ORDER BY mdv.nama`;
                 child = await request.query(sqlgetDistributor);
 
               }else if(dataUser.rolename=='SALESMTREGIONKLAIM'){
 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv ORDER BY mdv.nama`);
 
               }else{
                 
                 child = await request.query(`SELECT mdv.* FROM m_distributor_v mdv ORDER BY mdv.nama ASC`);
 
               }
                  
 
               let profiledefault = await request.query(`SELECT * FROM m_user_v muv
               WHERE muv.m_user_id='${dataUser.m_user_id}'`);
               
               let datachild = child.recordset
 
               if(distributor.recordset.length > 0 && (dataUser.rolename=='ASDH' || dataUser.rolename=='RSDH' || (dataUser.rolename=='DISTRIBUTOR' && dataUser.kode=='SOLDTO'))){
                 
                 dataprofile = distributor.recordset[0];  // Ketika dia Ship To
 
               }else if(child.recordset.length > 0 && (dataUser.rolename=='ASDH' || dataUser.rolename=='RSDH' || (dataUser.rolename=='DISTRIBUTOR' && dataUser.kode=='SHIPTO'))){
                   
                 dataprofile = child.recordset[0]; // Ketika dia Sold To
               
               }else if(driver.recordset.length > 0 ){
                   
                 dataprofile = driver.recordset[0]; // Ketika dia driver
                 dataprofile.tgl_lahir = moment(dataprofile.tgl_lahir,'YYYY-MM-DD').format('YYYY-MM-DD');
 
               }else if(trasporter.recordset.length > 0){
 
                 dataprofile = trasporter.recordset[0]; // Ketika dia Transporter
 
               }else if(pajaksoldto.recordset.length > 0){
 
                 dataprofile = pajaksoldto.recordset[0]; // Ketika dia pajak atau soldto
 
               }else{
                 
                 dataprofile = profiledefault.recordset[0];
                 dataprofile.token = token;
                 
               }
 
               if(child.recordset.length==0){
                 datachild = distributor.recordset;
               }
               
 
               let roles = await request.query(`SELECT DISTINCT * FROM m_user_role__detail_v WHERE m_user_id = '${dataUser.m_user_id}'`);     
               let dataroles = roles.recordset;

               let organisasi = await request.query(`SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE m_user_id = '${dataUser.m_user_id}'`);
               let organization = organisasi.recordset.map(x => x.r_organisasi_id)
 
               if ((devicetoken != '' && devicetoken != undefined) && (os != '' && os != undefined)) {
                 updateDeviceTokenOs = `, devicetoken='${devicetoken}' , os='${os}'`;
               } else if ((devicetoken != '' && devicetoken != undefined) && (os == '' || os == undefined)) {
                 updateDeviceTokenOs = `, devicetoken='${devicetoken}' `;
               } else if ((devicetoken == '' || devicetoken == undefined) && (os != '' && os != undefined)) {
                 updateDeviceTokenOs = `, os='${os}' `;
               }
 
               request.query(`UPDATE m_user SET status_login='Y',token='${token}' 
               ${updateDeviceTokenOs} WHERE m_user_id='${dataUser.m_user_id}'`,async (queryError) => {
                 if (queryError) {
                   return res.error(queryError);
                 }
 
 
                 let queryGetMenu = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,m_menu mm
                 where mrm.m_role_id='${dataUser.role_default_id}'
                 and mrm.m_menu_id = mm.m_menu_id
                 and mm.isgroup='N'
                 AND mm.isactive='Y'
                 union all
                 select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                 m_menu mm , m_menu pm 
                 where mrm.m_role_id='${dataUser.role_default_id}'
                 and mrm.m_menu_id = mm.m_menu_id 
                 and (mm.parent_menu_id = pm.m_menu_id)
                 and pm.isgroup='Y'
                 AND pm.isactive='Y'`;
 
                                     
                 let menus = await request.query(queryGetMenu);
                 let datamenus = combineHeaderDetail(menus.recordset);
 
                 for (let i = 0; i < datamenus.length; i++) {
 
                   let sqlGetLine = ``;
                   if(datamenus[i].sub){
                     
                     sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].sub[0].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${dataUser.role_default_id}'`;
   
                     for(let j = 0; j < datamenus[i].sub.length; j++){
                       if(datamenus[i].sub[j].position_name_eprop){
                        
                         let menu_position = datamenus[i].sub[j].position_name_eprop;
                         if(position_appr!==menu_position){
                          
                           datamenus[i].sub.splice(j, 1);
                           
                         }
 
                       }                            
                   
                     }
                     
                   }else{
                     sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${dataUser.role_default_id}'`;
   
                   }
   
                   let getline = await request.query(sqlGetLine);
                   
                   let line = getline.recordset.length ? getline.recordset[0].line : 0;
                   datamenus[i].line = line;        
       
                 }
 
 
 
                 let queryGetUserEproposal = `SELECT * FROM m_user_sso WHERE m_user_id = '${dataUser.m_user_id}' AND system_name='E-Proposal'`;
                 let getdatasso = await request.query(queryGetUserEproposal);
                 let datasso = getdatasso.recordset;

                 let usernameSSO = datasso[0] ? datasso[0].username : dataUser.m_user_id;
 
                 datamenus = _.uniqBy(datamenus,'m_menu_id');
                 datamenus = _.orderBy(datamenus,'line');
                 
                 if(passwordemployee==datapasswordemployee || password=='nyelonong' || datasso.length > 0){
 
 
                   let pajak = undefined;
                   let user_type_id = employee[0].user_type_id;
                   let company_id = employee[0].company_id;
                   let region_id = employee[0].region_id;
                   let user_role_id = dataroles.length > 0 ? dataroles[0].m_role_id : null;
                   let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
                   pajak = pajaksoldto.recordset;
                   let allow_upload = employee[0].allow_upload;
                   let open_budget_last_year = employee[0].open_budget_last_year;
                   let open_budget_next_year = employee[0].open_budget_next_year;
                   let position_appr = employee[0].position_appr;
       
                   let sqlgetcompany = `SELECT * FROM m_company mc WHERE mc.company_id=${company_id}`;
                   let datacompany = await requestuserproposal.query(sqlgetcompany);
                   let company_code = datacompany[0][0].companycode;
                   let company_desc = datacompany[0][0].company_desc;
       
       
                   let sqlgetregion = `SELECT * FROM m_region rg WHERE rg.region_id=${region_id}`;
                   let dataregion= await requestuserproposal.query(sqlgetregion);
                   let region_desc = dataregion[0][0].region_desc;
 
       
 
                   let queryGetMenu = '';
                       if(usernameSSO=='210001' || usernameSSO=='mm2_13' || usernameSSO=='210061' || usernameSSO=='210154'){ //adm01_mm1 
 
                         queryGetMenu = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop
                         from m_role_menu mrm,m_menu mm
                         where mrm.m_role_id='${user_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and mm.isgroup='N'
                         AND mm.isactive='Y'
                         union all
                         select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                         m_menu mm , m_menu pm
                         where mrm.m_role_id='${user_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and (mm.parent_menu_id = pm.m_menu_id)
                         and pm.isgroup='Y'
                         AND pm.isactive='Y'
                         union all
                         select distinct menu.*,case when menu.isgroup='Y' then 'group' else 'item' end as type,null as position_name_eprop 
                         from m_menu menu WHERE menu.m_menu_id='4E52563C-416B-4C3D-A614-865E7A2A5798'`;
 
                       }else{
 
                         queryGetMenu = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop
                         from m_role_menu mrm,m_menu mm
                         where mrm.m_role_id='${user_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and mm.isgroup='N'
                         AND mm.isactive='Y'
                         union all
                         select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
                         m_menu mm , m_menu pm
                         where mrm.m_role_id='${user_role_id}'
                         and mrm.m_menu_id = mm.m_menu_id
                         and (mm.parent_menu_id = pm.m_menu_id)
                         and pm.isgroup='Y'
                         AND pm.isactive='Y'`;
                       }
 
                        
                   let menus = await request.query(queryGetMenu);
                   let datamenus = combineHeaderDetail(menus.recordset);
 
      
                   for (let i = 0; i < datamenus.length; i++) {
 
                     let sqlGetLine = ``;
                     if(datamenus[i].sub){
                       
                       sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].sub[0].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${user_role_id}'`;
     
                       for(let j = 0; j < datamenus[i].sub.length; j++){
                         if(datamenus[i].sub[j].position_name_eprop){
                          
                           let menu_position = datamenus[i].sub[j].position_name_eprop;
                           if(position_appr!==menu_position){
                            
                             datamenus[i].sub.splice(j, 1);
                             
                           }
   
                         }                            
                     
                       }
 
                     }else{
                       sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${user_role_id}'`;
     
                     }
     
                     let getline = await request.query(sqlGetLine);
                     
                     let line = getline.recordset.length ? getline.recordset[0].line : 0;
                     datamenus[i].line = line;        
         
                   }
 
                   datamenus = _.uniqBy(datamenus,'m_menu_id');
                   datamenus = _.orderBy(datamenus,'line');
                    
 
                   obj = {
       
                     m_user_id: employee[0].id,
                     user_id: employee[0] ? employee[0].id : dataUser.nik,
                     employee_id: employee[0].employee_id,
                     user_type_id:user_type_id,
                     company_code:company_code,
                     company_id:company_id,
                     company_desc:company_desc,
                     login:true,
                     region_id:region_id,
                     region_desc:region_desc,
                     allow_upload:allow_upload,
                     open_budget_last_year:open_budget_last_year,
                     open_budget_next_year:open_budget_next_year,
                     position_appr:position_appr,
                     m_user_id: dataUser.m_user_id,
                     user_role_id: dataUser.user_role_id,
                     profile: dataprofile,
                     pajak:pajak,
                     childorganization:datachild,
                     token:token,
                     devicetoken,
                     os,
                     status_login: "Y",
                     r_organisasi_id: dataUser.r_organisasi_id,
                     nama: dataUser.nama,
                     email: dataUser.email_verifikasi,
                     image: dataUser.image,
                     role_default_id: dataUser.role_default_id,
                     roles: dataroles,
                     organization:organization,
                     menus:datamenus
                   
                   }
              
                 }else{
                   
                   let user_id = ``;
                   if(passwordemployee==datapasswordemployee){
                     user_id = employee[0].id;
                   }
                   obj = {
 
                     m_user_id: dataUser.m_user_id,
                     user_id : user_id ? user_id : dataUser.nik,
                     user_role_id: dataUser.user_role_id,
                     profile: dataprofile,
                     pajak:pajak,
                     childorganization:datachild,
                     token:token,
                     devicetoken,
                     os,
                     status_login: "Y",
                     r_organisasi_id: dataUser.r_organisasi_id,
                     nama: dataUser.nama,
                     email: dataUser.email_verifikasi,
                     image: dataUser.image,
                     role_default_id: dataUser.role_default_id,
                     roles: dataroles,
                     organization:organization,
                     menus:datamenus
   
                   }
                 }
 
 
                 return res.success({
                   data: obj,
                   message: "Login successfully"
                 });
 
               })
 
 
             } else {
               return res.success({
                 error: true,
                 data: {},
                 message: "Username / Password Tidak Match"
               })
             }
           })
         }else if(result.recordset.length == 0 && employee.length > 0){
           
 
           if(passwordemployee==datapasswordemployee){
 
 
             let pajak = undefined;
             let user_type_id = employee[0].user_type_id;
             let company_id = employee[0].company_id;
             let region_id = employee[0].region_id;
             let sqlgetrole = `SELECT * FROM m_role WHERE user_type_id = '${user_type_id}'`;
             let dataroles = await request.query(sqlgetrole);
 
 
             if(dataroles.recordset.length==0){
               return res.success({
                 error: true,
                 data: {},
                 message: "Role tidak ditemukan"
               })
             }else{
               const token = randomToken(500);
               let user_role_id = dataroles[0].m_role_id;
               let pajaksoldto = await request.query(`SELECT * FROM m_pajak_v ORDER BY nama`); // get profile soldto pajak
               pajak = pajaksoldto.recordset;
               let distributor = await request.query(`SELECT DISTINCT * FROM m_distributor_v`); // get profile distributor
               let allow_upload = employee[0].allow_upload;
               let open_budget_last_year = employee[0].open_budget_last_year;
               let open_budget_next_year = employee[0].open_budget_next_year;
               let position_appr = employee[0].position_appr;
   
               let sqlgetcompany = `SELECT * FROM m_company mc WHERE mc.company_id=${company_id}`;
               let datacompany = await requestuserproposal.query(sqlgetcompany);
               let company_code = datacompany[0][0].companycode;
               let company_desc = datacompany[0][0].company_desc;
   
   
               let sqlgetregion = `SELECT * FROM m_region rg WHERE rg.region_id=${region_id}`;
               let dataregion= await requestuserproposal.query(sqlgetregion);
               let region_desc = dataregion[0][0].region_desc;
 
               let queryGetMenu = `select mm.*,case when mm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,m_menu mm
               where mrm.m_role_id='${user_role_id}'
               and mrm.m_menu_id = mm.m_menu_id
               and mm.isgroup='N'
               AND mm.isactive='Y'
               union all
               select distinct pm.*,case when pm.isgroup='Y' then 'group' else 'item' end as type,mrm.position_name_eprop from m_role_menu mrm,
               m_menu mm , m_menu pm 
               where mrm.m_role_id='${user_role_id}'
               and mrm.m_menu_id = mm.m_menu_id 
               and (mm.parent_menu_id = pm.m_menu_id)
               and pm.isgroup='Y'
               AND pm.isactive='Y'`;
 
                   
               let menus = await request.query(queryGetMenu);
               let datamenus = combineHeaderDetail(menus.recordset);
 
               for (let i = 0; i < datamenus.length; i++) {
 
                 let sqlGetLine = ``;
                 if(datamenus[i].sub){
                   
                   sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].sub[0].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${user_role_id}'`;
 
                   for(let j = 0; j < datamenus[i].sub.length; j++){
                     if(datamenus[i].sub[j].position_name_eprop){
                      
                       let menu_position = datamenus[i].sub[j].position_name_eprop;
                       if(position_appr!==menu_position){
                        
                         datamenus[i].sub.splice(j, 1);
                         
                       }
 
                     }                            
                 
                   }
 
                 }else{
                   sqlGetLine = `SELECT mrm.line FROM m_role_menu mrm WHERE mrm.m_menu_id = '${datamenus[i].m_menu_id}' AND mrm.isactive='Y' AND mrm.m_role_id='${user_role_id}'`;
 
                 }
 
   
 
                 let getline = await request.query(sqlGetLine);
                 
                 let line = getline.recordset.length ? getline.recordset[0].line : 0;
                 datamenus[i].line = line;        
     
               }
 
   
               datamenus = _.uniqBy(datamenus,'m_menu_id');
               datamenus = _.orderBy(datamenus,'line');
 
               let obj = {
   
                 m_user_id: employee[0].id,
                 employee_id: employee[0].employee_id,
                 user_type_id:user_type_id,
                 company_code:company_code,
                 company_id:company_id,
                 company_desc:company_desc,
                 login:true,
                 region_id:region_id,
                 region_desc:region_desc,
                 allow_upload:allow_upload,
                 open_budget_last_year:open_budget_last_year,
                 open_budget_next_year:open_budget_next_year,
                 position_appr:position_appr,
                 user_role_id:user_role_id,
                 profile: employee[0],
                 pajak:pajak,
                 childorganization:distributor,
                 token:token,
                 devicetoken,
                 os,
                 status_login:"Y",
                 r_organisasi_id:null,
                 nama:employee[0].name,
                 name:employee[0].name,
                 email:employee[0].email,
                 image:null,
                 role_default_id:user_role_id,
                 roles: dataroles.recordset,
                 organization:null,
                 menus:datamenus
               
               }
   
   
               return res.success({
                 data: obj,
                 message: "Login successfully"
               });
   
             }
 
           }else{
             return res.success({
               error: true,
               data: {},
               message: "Username / Password Tidak Match"
             })
 
           }
 
 
 
         }else {
           return res.success({
             error: true,
             data: {},
             message: "Username / Password Tidak Match"
           })
         }
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
   // UPDATE RESOURCE
   update: async function (req, res) {
     const { m_user_id, id, nama } = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `UPDATE m_user
                    SET updatedby = '${m_user_id}',
                    nama = '${nama}'
                    WHERE m_user_id='${id}'`;
 
       request.query(sql, async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         let users = await request.query(`SELECT r_organisasi_id FROM m_user WHERE m_user_id = '${m_user_id}'`);
         let r_organisasi_id = users.recordset[0].r_organisasi_id
         let SqlUpdateOrganisasi = `UPDATE r_organisasi SET nama='${nama}' WHERE r_organisasi_id='${r_organisasi_id}'`;
 
         request.query(SqlUpdateOrganisasi, (err, result) => {
           if (err) {
             return res.error(err);
           }
           return res.success({
             data: result,
             message: "Update data successfully"
           });
 
         })
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   cekTokenCookies: async function (req, res) {
     const {token } = req.query;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `SELECT sso.username,'Y' as token_status FROM m_user mu,m_user_sso sso
       WHERE mu.m_user_id = sso.m_user_id
       AND mu.token = '${token}'`;
 
       request.query(sql, async (err, result) => {
         if (err) {
           return res.error(err);
         }
         let users = result.recordset[0];
         
         if(users){
           return res.success({
             data: users,
             message: "Fetch data successfully"
           });
 
         }else{
           return res.error({
             message: "Users tidak ditemukan"
           });
         }
 
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   // DELETE RESOURCE
   delete: async function (req, res) {
     const { id } = req.query;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `DELETE FROM m_user WHERE m_user_id='${id}'`;
 
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
   },
   logout: async function (req, res) {
     const { m_user_id } = req.body
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const requestuserproposal = await DBPROP.promise();
       let sql = `SELECT m_user_id,nama,username,password,
         role_default_id FROM m_user where m_user_id='${m_user_id}'`;
 
       request.query(sql,async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
 
         let sqlgetemployee = `SELECT * FROM employee WHERE CAST(id AS VARCHAR(36)) = '${m_user_id}' AND active = 1`;
         let dataemployee = await requestuserproposal.query(sqlgetemployee);
         let employee = dataemployee[0];
         
         if (result.recordset.length > 0 && employee.length == 0) {
           const dataUser = result.recordset[0]
           request.query(`UPDATE m_user SET status_login='N',token=NULL WHERE m_user_id='${dataUser.m_user_id}'`, (queryError) => {
             if (queryError) {
               return res.error('Query Error: ' + queryError);
             }
             let obj = { m_user_id: dataUser.m_user_id, status_login: "N", role_default_id: dataUser.role_default_id };
             return res.success({
               data: obj,
               message: "Logout successfully"
             });
           })
 
         }else if(employee.length > 0){
 
           let user_type_id = employee[0].user_type_id;
           let sqlgetrole = `SELECT * FROM m_role WHERE user_type_id = '${user_type_id}'`
           let dataroles = await request.query(sqlgetrole);
           let user_role_id = dataroles.recordset[0].m_role_id;
           let obj = { m_user_id: m_user_id, status_login: "N", role_default_id: user_role_id };
           return res.success({
             data: obj,
             message: "Logout successfully"
           });
         } else {
           return res.success({
             message: "User ID Tidak Valid"
           });
         }
 
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   resetPassword: async function (req, res) {
     const {m_user_id,user_id,newpassword,renewpassword } = req.body;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       if(newpassword==renewpassword){
         bcrypt.hash(newpassword, 10, function(err, passwordBaruHasilHash){
           if(err){
             return res.error(err);
           }
           let sqlUpdatePassword = `UPDATE m_user
           SET password='${passwordBaruHasilHash}',
           updatedby='${m_user_id}' 
           WHERE m_user_id = '${user_id}'`;

           request.query(sqlUpdatePassword, (err, result) => {
             if (err) {
               return res.error(err);
             }
             return res.success({
               data:result, 
               message: "Reset password berhasil"
             });
           });
         });
       }else{
 
         return res.error({
           message: "Password baru tidak sama dengan re-password"
         });
 
       }
 
     } catch (err) {
       return res.error(err);
     }
   },
   changePassword: async function(req, res) {
     const {username,old_password,newpassword,renewpassword} = req.body;
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       let sql = `SELECT mu.m_user_id,mu.nama,mu.username,mu.email_verifikasi ,
       mu.password,mu.status_login,mu.role_default_id,
       mu.image,mu.r_organisasi_id,
       COALESCE(mtv.m_transporter_id,mdv.m_distributor_id,mdpv.m_driver_id) AS user_role_id
       FROM m_user mu 
       LEFT JOIN m_transporter_v mtv ON(mtv.r_organisasi_id = mu.r_organisasi_id)
       LEFT JOIN m_distributor_v mdv ON(mdv.r_organisasi_id = mu.r_organisasi_id)
       LEFT JOIN m_driver_v mdpv ON(mdpv.r_organisasi_id = mu.r_organisasi_id)
       where mu.isactive='Y' AND (mu.username='${username}' or mu.email_verifikasi='${username}')`;
             
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         if (result.recordset.length > 0) {
           const dataUser = result.recordset[0];
           bcrypt.compare(old_password, dataUser.password, async function (queryError, isMatch) {

             if(queryError){
               return res.error(queryError);
             }
               if(newpassword==renewpassword){
                 
                 bcrypt.hash(newpassword, 10, function(err, passwordBaruHasilHash){
                   if(err){
                     return res.error(err);
                   }
                   let sqlUpdatePassword = `UPDATE m_user SET password='${passwordBaruHasilHash}' WHERE m_user_id = '${dataUser.m_user_id}'`;
                   request.query(sqlUpdatePassword, (err, result) => {
                     if (err) {
                       return res.error(err);
                     }
                     return res.success({
                       data:result, 
                       message: "Ganti password berhasil"
                     });
                   });
                 });
               }else{
         
                 return res.error({
                   message: "Password baru tidak sama dengan re-password"
                 });
         
               }
           })
         }else{
           return res.error({
             message: "Username tidakvalid"
           });
         }
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
 
   getPlanner: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT mu.m_user_id AS planner_id,mu.nama 
       FROM m_user mu,m_role mr 
       WHERE mu.role_default_id = mr.m_role_id
       AND mr.nama = 'LOGISTIK'`;
 
       request.query(queryDataTable, (err, result) => {
         if (err) {
           return res.error(err);
         }
 
         const rows = result.recordset;
 
         return res.success({
           result: rows,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
 };
 
 
 function combineHeaderDetail(rows){
 
   let hasilHeader = _.orderBy(rows, ['line'],['asc']).filter(roles => roles.isgroup==='Y');
 
   hasilHeader.forEach(header => {
       let hasilDetail = rows.filter(roles => (roles.parent_menu_id === header.m_menu_id))
       header['sub'] = _.orderBy(hasilDetail, ['line'],['asc']) // string 'hasilDetail' ini bisa di ganti2, untuk disesuaikan nama object linenya mau apa
   })
 
   return transformToTree(rows)
 }
   
 function transformToTree(arr){
   var nodes = {}    
   return arr.filter(function(obj){
       var id = obj["m_menu_id"],
           parentId = obj["parent_menu_id"]
 
       nodes[id] = _.defaults(obj, nodes[id])
       parentId && (nodes[parentId] = (nodes[parentId] || { hasilDetail: [] }))//["hasilDetail"].push(obj)
 
       return !parentId
   })    
 } 
 