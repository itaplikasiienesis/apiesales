/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const bcrypt = require('bcryptjs');


module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {currentPage, pageSize,searchText,m_user_id}
    } = req;

    //console.log(req.query);
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      const whereClause = req.query.filter ? `AND ${req.query.filter}` : "";


      let org = `SELECT DISTINCT r_organisasi_id FROM m_user_organisasi WHERE isactive='Y' AND m_user_id = '${m_user_id}'`;
      let orgs = await request.query(org);
      let organization = orgs.recordset.map(function (item) {
        return item['r_organisasi_id'];
      });

      let valueIN = ""
      let listOrg = ""
      for (const datas of organization) {
        valueIN += ",'" + datas + "'"
      }

      valueIN = valueIN.substring(1)

      listOrg = organization.length > 0 && req.query.filter === undefined ? `AND r_organisasi_id IN (${valueIN})` : "";


      let sqlTrasporterId = `SELECT mt.m_transporter_id FROM m_user mu , m_transporter mt 
      WHERE mu.m_user_id='${m_user_id}'
      AND mu.r_organisasi_id = mt.r_organisasi_id`;
      let trasporter = await request.query(sqlTrasporterId);
      let m_transporter_id = trasporter.recordset[0].m_transporter_id;

      //console.log(sqlTrasporterId);
      let filterbytransporter = ``;
      if(trasporter.recordset.length > 0){
        filterbytransporter =`AND m_transporter_id = '${m_transporter_id}'`;
        listOrg=``;
      }


      let whereClauseSearchText = ``;
      if (searchText) {
        whereClauseSearchText = `AND nomor_hp='%${searchText}%' AND nama LIKE '%${searchText}%'
        OR kode LIKE '%${searchText}%' OR nomor_ktp LIKE '%${searchText}%'
        OR nomor_sim LIKE '%${searchText}%'`;
      }

      let offsetlimitdefinitions = ``;
      if (pageSize) {
        offsetlimitdefinitions = `OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY`;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                              FROM m_driver_v WHERE 1=1 ${listOrg} ${whereClause} ${filterbytransporter} ${whereClauseSearchText}`;

      let queryDataTable = `SELECT * FROM m_driver_v WHERE 1=1 ${listOrg} ${whereClause} ${filterbytransporter} ${whereClauseSearchText}
                            ORDER BY nama
                            ${offsetlimitdefinitions}`;

      //console.log(queryDataTable);
                           

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

      let queryDataTable = `SELECT * FROM m_driver_v WHERE m_driver_id='${req.param(
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
    const {m_user_id,nama,tgl_lahir,nomor_ktp,nomor_sim,nomor_hp,m_transporter_id,username,password} = req.body;

    console.log(req.body);
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let kode = otpGenerator.generate(6, { alphabets:false, upperCase: false, specialChars: false });
      let sqlGetJenisOrg = `SELECT r_jenis_organisasi_id FROM r_jenis_organisasi WHERE kode='DRV'`;
      const datajenisorg = await request.query(sqlGetJenisOrg);
      let r_jenis_organisasi_id = datajenisorg.recordset[0].r_jenis_organisasi_id;

      let sqlGetRoleDriver = `SELECT m_role_id FROM m_role WHERE r_jenis_organisasi_id='${r_jenis_organisasi_id}'`;
      const datadriver = await request.query(sqlGetRoleDriver);
      let m_role_id = datadriver.recordset[0].m_role_id;
      
      let r_organisasi_id = uuid();
      let m_driver_id = uuid();

      const sqlinsertOrg = `INSERT INTO r_organisasi
      (r_organisasi_id,createdby,updatedby,nama,r_jenis_organisasi_id,kode)
      VALUES('${r_organisasi_id}','${m_user_id}','${m_user_id}','${nama}',
      '${r_jenis_organisasi_id}','${kode}')`;
      console.log(sqlinsertOrg);
      
      await request.query(sqlinsertOrg);


      const sql = `INSERT INTO m_driver
                    ( m_driver_id,createdby,updatedby,r_organisasi_id,
                    nomor_hp,m_transporter_id)
                   VALUES (
                    '${m_driver_id}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${r_organisasi_id}',
                    '${nomor_hp}',
                    '${m_transporter_id}'
                  )`;
                  console.log(sql);            
      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

      let queryCountTableUsers = `SELECT COUNT(1) AS total_rows FROM m_user where isactive='Y'
      and username='${nomor_hp}'`;


      const totalItemsUsers = await request.query(queryCountTableUsers);
      const countUsers = totalItemsUsers.recordset[0].total_rows || 0;
      if (countUsers > 0) {
       

        let queryDataTable = `SELECT * FROM m_driver_v WHERE m_driver_id='${m_driver_id}'`;
        let data_driver = await request.query(queryDataTable);
        let driver = data_driver.recordset[0];

        const sqlDeleteDriver = `DELETE FROM m_driver WHERE m_driver_id='${m_driver_id}'`;
        await request.query(sqlDeleteDriver);  
        const r_organisasi_id = driver.r_organisasi_id;
        const sqlDeleteOrg = `DELETE FROM r_organisasi WHERE r_organisasi_id='${r_organisasi_id}'`;
        await request.query(sqlDeleteOrg);

        return res.error({
          message: "Username atau email sudah terdaftar"
        });
        //res.status(500).send('Username atau email sudah terdaftar');
        //return
      } else {

        bcrypt.hash(password, 10, async function (queryError, passwordHasilHash) {

          let nomor_handphone = nomor_hp.replace(/\s/g, '');
          let newuserid = uuid();
          let sqlinsertUser = `INSERT INTO m_user
          (m_user_id,createdby, updatedby, username, password, 
          role_default_id, 
          r_organisasi_id,nama)
          VALUES('${newuserid}','${m_user_id}', '${m_user_id}', '${nomor_handphone}', 
          '${passwordHasilHash}','${m_role_id}',
          '${r_organisasi_id}', '${nama}')`;
          await request.query(sqlinsertUser);

          let sqlMuserOrganisasi1 = `INSERT INTO m_user_organisasi
          (m_user_id, r_organisasi_id)
          VALUES('${newuserid}', '${r_organisasi_id}')`;
          await request.query(sqlMuserOrganisasi1);
  
          let sqlMuserOrganisasi2 = `INSERT INTO m_user_organisasi
          (m_user_id, r_organisasi_id)
          VALUES('${m_user_id}', '${r_organisasi_id}')`;
          await request.query(sqlMuserOrganisasi2);

          let queryDataTable = `SELECT * FROM m_driver_v WHERE m_driver_id='${m_driver_id}'`;
          let data_driver = await request.query(queryDataTable);
          let driver = data_driver.recordset[0];

          return res.success({
            data: driver,
            message: "Insert data successfully"
          });
        });

      }

      });
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function(req, res) {
    const {m_user_id,m_driver_id,nama,tgl_lahir,nomor_ktp,nomor_sim,nomor_hp} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sqlgetdataDriver = `SELECT r_organisasi_id FROM m_driver_v WHERE m_driver_id = '${m_driver_id}'`;
      getdataDriver = await request.query(sqlgetdataDriver);  
      let r_organisasi_id = getdataDriver.recordset[0].r_organisasi_id;
      
      
      let sqlUpdateNama = `UPDATE r_organisasi SET updated=getdate(),updatedby = '${m_user_id}',nama='${nama}' WHERE r_organisasi_id='${r_organisasi_id}'`;
      await request.query(sqlUpdateNama);

      let sql = `UPDATE m_driver SET updated=getdate(),updatedby = '${m_user_id}',
      tgl_lahir = '${tgl_lahir}',
      nomor_ktp = '${nomor_ktp}',
      nomor_sim = '${nomor_sim}',
      nomor_hp = '${nomor_hp}'
     WHERE m_driver_id='${m_driver_id}'`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let sqlUpdatedUsername = `UPDATE m_user SET username='${nomor_hp}' WHERE r_organisasi_id='${r_organisasi_id}'`;
        await request.query(sqlUpdatedUsername);


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
    const { m_driver_id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM m_driver WHERE m_driver_id='${m_driver_id}'`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let datanya = undefined;

        if(result.recordset.length > 0){

          const sqlDeleteDriver = `DELETE FROM m_driver WHERE m_driver_id='${m_driver_id}'`;
          await request.query(sqlDeleteDriver);  
          const r_organisasi_id = result.recordset[0].r_organisasi_id;
          
          const sqlDeleteUsers = `DELETE FROM m_user WHERE r_organisasi_id='${r_organisasi_id}'`;
          await request.query(sqlDeleteUsers);

          const sqlDeleteOrg = `DELETE FROM r_organisasi WHERE r_organisasi_id='${r_organisasi_id}'`;
          await request.query(sqlDeleteOrg);

          
          
          datanya = result.recordset;
        
        }else{

          datanya = 'No Data';

        }

        return res.success({
          data: datanya,
          message: "Delete data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};
