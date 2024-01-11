/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const { conforms } = require("lodash");
 const DBPROP = require("../../services/DBPROPOSAL");
 
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
                               FROM m_role ${whereClause}`;
 
       let queryDataTable = `SELECT mr.nama AS kode, rjo.nama FROM m_role mr,r_jenis_organisasi rjo 
                             WHERE mr.r_jenis_organisasi_id = rjo.r_jenis_organisasi_id ${whereClause}
                             ORDER BY mr.created
                             OFFSET ${offset} ROWS
                             FETCH NEXT ${limit} ROWS ONLY`;
 
       const totalItems = await request.query(queryCountTable);
       const count = totalItems.recordset[0].total_rows || 0;
 
       request.query(queryDataTable,async (err, result) => {
         if (err) {
           return res.error(err);
         }
 
            var rows = await result.recordset;
         
            const meta = paginate(currentPage, count, rows, pageSize);

            for (let i = 0; i < rows.length; i++) {
              
              rows[i].no = i + 1;
              
            }
 
            return res.success({
               result: rows,
               meta,
               message: "Fetch data successfully"
             });
         })
 
     } catch (err) {
       return res.error(err);
     }
   },
 
   // GET ONE RESOURCE
   findOne: async function(req, res) {
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
 
       let queryDataTable = `SELECT m_role_id,kode,nama FROM m_role WHERE m_role_id='${req.param(
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
     const {m_user_id,kode,nama} = req.body;
     await DB.poolConnect;
     try {
       const id = uuid();
       const request = DB.pool.request();
       const sql = `INSERT INTO m_roles
                     (m_role_id,createdby, updatedby,nama,kode)
                    VALUES (
                     '${id}',
                     '${m_user_id}',
                     '${m_user_id}',
                     '${nama}',
                     '${kode}'
                   )`;
 
       request.query(sql, (err, result) => {
         if (err) {
           return res.error(err);
         }
         return res.success({
            result: result,
            message: "Insert data successfully"
          });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   // UPDATE RESOURCE
   update: async function(req, res) {
     const { m_user_id,m_role_id,nama} = req.body;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `UPDATE m_role SET updatedby = '${m_user_id}',
                    nama = '${nama}'
                    WHERE m_role_id='${m_role_id}'`;
 
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
   maintaindata: async function(req, res) {
    //const { id } = req.query;
    const requestuserproposal = await DBPROP.promise();
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM m_user_sso`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset;

        for (let i = 0; i < rows.length; i++) {
          const username = rows[i].username;
          const m_user_sso_id = rows[i].m_user_sso_id;

          let sqlgetemployee = `SELECT * FROM employee WHERE employee_id = '${username}' AND active = 1`;
          let dataemployee = await requestuserproposal.query(sqlgetemployee);
          let employee = dataemployee[0];

          console.log(employee);

          if(employee.length > 0){
            let user_type_id = employee[0].user_type_id;
            let sqlUpdateData = `UPDATE m_user_sso SET user_type_id = '${user_type_id}' WHERE m_user_sso_id = '${m_user_sso_id}'`;
            await request.query(sqlUpdateData);
          }

          

          //console.log(employee);
          
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


 
   // DELETE RESOURCE
   delete: async function(req, res) {
     const { id } = req.query;
 
     await DB.poolConnect;
     try {
       const request = DB.pool.request();
       const sql = `DELETE FROM m_roles WHERE m_role_id='${id}'`;
 
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


   getattribute: async function(req, res) {
    const { username } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      

      const sql =`SELECT mu.m_user_id,mu.nama,mu.username,mu.email_verifikasi,
      mu.password,mu.status_login,mu.role_default_id,
      mu.image,mu.r_organisasi_id,
      COALESCE(mtv.m_transporter_id,mdv.m_distributor_id,mdpv.m_driver_id,mpjk.m_pajak_id) AS user_role_id,
      mrl.nama AS rolename,
      mu.r_distribution_channel_id,
      rjo.kode
      FROM m_user mu 
      LEFT JOIN m_transporter_v mtv ON(mtv.r_organisasi_id = mu.r_organisasi_id)
      LEFT JOIN m_distributor_v mdv ON(mdv.r_organisasi_id = mu.r_organisasi_id)
      LEFT JOIN m_driver_v mdpv ON(mdpv.r_organisasi_id = mu.r_organisasi_id)
      LEFT JOIN m_pajak_v mpjk ON(mpjk.r_organisasi_id = mu.r_organisasi_id)
      LEFT JOIN m_role mrl ON(mrl.m_role_id = mu.role_default_id)
      LEFT JOIN r_jenis_organisasi rjo ON(rjo.r_jenis_organisasi_id = mrl.r_jenis_organisasi_id)
      where mu.isactive='Y' AND (mu.username='${username}' or mu.nik='${username}')`;

      let getUser =  await request.query(sql);
      const dataUser = getUser.recordset[0];

      if(dataUser){
        let distributor = await request.query(`SELECT DISTINCT * FROM m_distributor_v WHERE m_distributor_id = '${dataUser.user_role_id}'`); // get profile distributor
        let trasporter = await request.query(`SELECT DISTINCT * FROM m_transporter_v WHERE m_transporter_id = '${dataUser.user_role_id}'`); // get profile transporter
        let driver = await request.query(`SELECT DISTINCT * FROM m_driver_v WHERE m_driver_id = '${dataUser.user_role_id}'`); // get profile driver
        let pajaksoldto = await request.query(`SELECT DISTINCT * FROM m_pajak_v WHERE m_pajak_id = '${dataUser.user_role_id}'`); // get profile soldto pajak
  
        let dataprofile = undefined;
        let child = undefined;
        let pajak = undefined
  
        if(dataUser.rolename=='DISTRIBUTOR' && pajaksoldto.recordset.length > 0){
                     
          pajak = pajaksoldto.recordset
        
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
          console.log("xxxxxxxxx");
  
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
  
          // let sqlgetDistributor = `SELECT mdv.* FROM m_distributor_v mdv WHERE 1=1 ${listRegion} ORDER BY mdv.nama`;
          let sqlgetDistributor = `SELECT mdv.* FROM m_distributor_v mdv WHERE 1=1 ORDER BY mdv.nama`;
          // console.log(sqlgetDistributor);
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
          //dataUser.rolename=='ASDH' || dataUser.rolename=='RSDH' ||
          
          dataprofile = distributor.recordset[0];  // Ketika dia Ship To
  
        }else if(child.recordset.length > 0 && ( (dataUser.rolename=='DISTRIBUTOR' && dataUser.kode=='SHIPTO'))){
           //dataUser.rolename=='ASDH' || dataUser.rolename=='RSDH' || 
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
          
        }
  
        if(child.recordset.length==0){
          datachild = distributor.recordset;
        }
  
  
        let sqlGetDataPermission = `SELECT DISTINCT mrp.nama 
        FROM m_user_role mur ,m_role mrp 
        WHERE mur.m_user_id = '${dataUser.m_user_id}'
        AND mur.m_role_id = mrp.m_role_id`;
  
  
  
        //console.log(sqlGetDataPermission);
  
        let resultroles = await request.query(sqlGetDataPermission);
  
        let response = {
          m_user_id : dataUser.m_user_id,
          profile:{
            m_user_id : dataUser.m_user_id
          },
          roles : resultroles.recordset,
          pajak:pajak,
          childorganization:datachild
        }
  
        return res.success({
          data: response,
          message: "Fetch data successfully"
        });
      }else{

        return res.error({
          message: "User tidak ditemukan"
        });
      }


      

    } catch (err) {
      return res.error(err);
    }
  },
 };
 