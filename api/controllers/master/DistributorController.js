/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const mssql = require('mssql')
const bcrypt = require('bcryptjs')

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
                              FROM m_distributor ${whereClause}`;

      let queryDataTable = `SELECT * FROM m_distributor ${whereClause}
                            ORDER BY m_distributor_id
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;
        const meta = paginate(currentPage, count, rows, pageSize);
        for(let i = 0;i< rows.length ; i++){

            let m_pajak_id = rows[i].m_pajak_id;
            let pajak = await request.query(`SELECT a.*,b.nama 
            from m_pajak a,r_organisasi b
            where a.m_pajak_id='${m_pajak_id}'
            and a.r_organisasi_id = b.r_organisasi_id`);
            result.recordset[i].pajak = pajak.recordset[0];

            let r_organisasi_id = rows[i].r_organisasi_id;
            let organisasi = await request.query(`SELECT * from r_organisasi 
            where r_organisasi_id='${r_organisasi_id}'`);
            result.recordset[i].organisasi = organisasi.recordset[0];

            let r_distribution_channel_id = rows[i].r_distribution_channel_id;
            let distributionchannel = await request.query(`SELECT * from r_distribution_channel 
            where r_distribution_channel_id='${r_distribution_channel_id}'`);
            result.recordset[i].distributionchannel = distributionchannel.recordset[0];

            let r_region_id = rows[i].r_region_id;
            let region = await request.query(`SELECT * from r_region where r_region_id='${r_region_id}'`);
            result.recordset[i].region = region.recordset[0];

            delete result.recordset[i].r_organisasi_id;
            delete result.recordset[i].r_distribution_channel_id;
            delete result.recordset[i].m_pajak_id;
            delete result.recordset[i].r_region_id;
        }
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

      let queryDataTable = `SELECT * FROM m_distributor WHERE m_distributor_id='${req.param(
        "id"
      )}'`;

      request.query(queryDataTable,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        const row = result.recordset[0];
        if(result.recordset.length > 0){

          let m_pajak_id = row.m_pajak_id;
          let pajak = await request.query(`SELECT a.*,b.nama from m_pajak a,r_organisasi b 
          where a.m_pajak_id='${m_pajak_id}'
          and a.r_organisasi_id = b.r_organisasi_id`);
          result.recordset[0].pajak = pajak.recordset[0];

          let r_organisasi_id = row.r_organisasi_id;
          let organisasi = await request.query(`SELECT * from r_organisasi where r_organisasi_id='${r_organisasi_id}'`);
          result.recordset[0].organisasi = organisasi.recordset[0];

          let r_distribution_channel_id = row.r_distribution_channel_id;
          let distributionchannel = await request.query(`SELECT * from r_distribution_channel where r_distribution_channel_id='${r_distribution_channel_id}'`);
          result.recordset[0].distributionchannel = distributionchannel.recordset[0];

          let r_region_id = row.r_region_id;
          let region = await request.query(`SELECT * from r_region where r_region_id='${r_region_id}'`);
          result.recordset[0].region = region.recordset[0];

          delete result.recordset.r_organisasi_id;
          delete result.recordset.r_distribution_channel_id;
          delete result.recordset.m_pajak_id;
          delete result.recordset.r_region_id;
      }

        return res.success({
          result: row,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  cekDistributor: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let queryCekShipto = `SELECT COUNT(1) AS data FROM m_distributor_v WHERE kode='${req.param(
        "id"
      )}'`;

      
      let queryCekSoldto = `SELECT COUNT(1) AS data FROM m_pajak_v WHERE kode='${req.param(
        "id"
      )}'`;

      let shipToCek = await request.query(queryCekShipto);
      let soldToCek = await request.query(queryCekSoldto);


      let dataShipto = shipToCek.recordset[0].data;
      let dataSoldto = soldToCek.recordset[0].data;

      let hasil = 'N';

      if(dataShipto > 0){
          hasil='Y';
      }

      if(dataSoldto > 0){
          hasil='Y';
      }


        return res.success({
          data: hasil,
          message: "Fetch data successfully"
        });
    } catch (err) {
      return res.error(err);
    }
  },

  // CREATE NEW RESOURCE
  new: async function(req, res) {
    const { m_user_id,r_organisasi_id,
        kode_pajak, district,
        region_id,
        region_desc, channel, status, doi,
        m_pajak_id, r_region_id,
        r_distribution_channel_id} = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `INSERT INTO m_distributor
                    (m_distributor_id,createdby,
                    updatedby,
                    r_organisasi_id,
                    kode_pajak, district,
                    region_id,
                    region_desc, channel, status, doi,
                    m_pajak_id, r_region_id,
                    r_distribution_channel_id)
                   VALUES (
                    '${uuid()}',
                    '${m_user_id}',
                    '${m_user_id}',
                    '${r_organisasi_id}',
                    '${kode_pajak}',
                    '${district}',
                    '${region_id}',
                    '${region_desc}',
                    '${channel}',
                    '${status}',
                    ${doi},
                    '${m_pajak_id}',
                    '${r_region_id}',
                    '${r_distribution_channel_id}',
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
  // DELETE RESOURCE
  delete: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM m_distributor WHERE m_distributor_id='${id}'`;

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
  createAccount: async function(req, res) {
    const { id } = req.body;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT * FROM m_distributor_v WHERE r_organisasi_id 
      NOT IN(SELECT r_organisasi_id FROM m_user)`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let rows = result.recordset;
        let password = 'enesisdist2019';
        let distributorOrg = await request.query(`SELECT mr.m_role_id FROM m_role mr,r_jenis_organisasi jo 
        WHERE mr.r_jenis_organisasi_id = jo.r_jenis_organisasi_id
        AND jo.kode = 'DST'`);
        let m_role_id = distributorOrg.recordset[0].m_role_id

        if(rows.length > 0){
          
          bcrypt.hash(password, 10,async function(queryError, passwordHasilHash) {

            const table = new mssql.Table('m_user');
            table.create = false;
            table.columns.add('m_user_id', mssql.TYPES.VarChar, { length: 36,nullable: false });
            table.columns.add('username', mssql.TYPES.VarChar, { length: 60,nullable: false });
            table.columns.add('nama', mssql.TYPES.VarChar, { length: 100,nullable: true });
            table.columns.add('password', mssql.TYPES.VarChar, { length: 1000,nullable: false });
            table.columns.add('role_default_id', mssql.TYPES.VarChar, { length: 36,nullable: true });
            table.columns.add('r_organisasi_id', mssql.TYPES.VarChar, { length: 36,nullable: false });
            
            for(let i = 0 ; i < rows.length ; i++ ){
              
              let m_user_id = uuid();  
              table.rows.add(m_user_id,rows[i].kode,rows[i].nama,
              passwordHasilHash,m_role_id,
              rows[i].r_organisasi_id);
            
            }
            
            await request.bulk(table);
            
            return res.success({
              data: rows,
              message: "Generate account successfully"
            });
  
          });

        }else{

          return res.success({
            message: "Generate account successfully"
          });
        }
        
      });
    } catch (err) {
      return res.error(err);
    }
  },


  getshipto: async function(req, res) {
    const {
      query: { region_id }
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let regionid = region_id;

      if(regionid.length > 0){
        let valueIN = '';
        for (const datas of regionid) {
          valueIN += ",'" + datas + "'"
        }
        valueIN = valueIN.substring(1);

        let regioonFilter = regionid.filter(e => e == '12');
        let queryDataTable = ``;
        if(regioonFilter.length > 0){

          queryDataTable = `SELECT * FROM m_distributor_v`;
        
        }else{
          queryDataTable = `SELECT * FROM m_distributor_v WHERE kode_region IN (${valueIN})`;
        }

        console.log(queryDataTable);

        request.query(queryDataTable,async (err, result) => {
          if (err) {
            return res.error(err);
          }
  
          const rows = result.recordset;     
  
          return res.success({
            result: rows,
            message: "Fetch data successfully"
          });
        });
      
      }else{

        return res.success({
          result: [],
          message: "Fetch data successfully"
        });

      }

    } catch (err) {
      return res.error(err);
    }
  },
  getshipto2: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();


      let queryDataTable = `SELECT * FROM m_distributor_v`;
      request.query(queryDataTable,async (err, result) => {
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
