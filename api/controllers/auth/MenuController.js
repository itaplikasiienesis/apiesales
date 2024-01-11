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
const axios = require('axios');
const FormData = require('form-data');
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
                              FROM m_menu ${whereClause}`;

      let queryDataTable = `SELECT a.*, b.nama as nama_parent_menu FROM m_menu a ${whereClause}
                            LEFT JOIN m_menu b ON(b.m_menu_id = a.parent_menu_id)
                            ORDER BY m_menu_id
                            OFFSET ${offset} ROWS
                            FETCH NEXT ${limit} ROWS ONLY`;

      const totalItems = await request.query(queryCountTable);
      const count = totalItems.recordset[0].total_rows || 0;

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        var rows = result.recordset;

        rows.map(item=>{
          if(!item.nama_parent_menu){
            item["nama_parent_menu"] = "Tidak Ada Parent"
          }
        })

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

      let queryDataTable = `SELECT * FROM m_menu WHERE m_menu_id='${req.param(
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
  findRoles: async function (req, res) {
    await DB.poolConnect;
    const {
      query: { m_role_id }
    } = req;
    try {
      const request = DB.pool.request();

      if (m_role_id) {

        queryDataTable = `SELECT mm.*
        FROM m_menu mm ,m_role_menu mrm 
        WHERE mm.isactive = 'Y'
        AND (mm.m_menu_id = mrm.m_menu_id 
        AND mrm.m_role_id = '${m_role_id}')
        ORDER BY mm.line`;

      } else {

        queryDataTable = `select mm.m_menu_id,mm.nama from m_menu mm
        where mm.isgroup = 'N' and mm.isactive = 'Y' `;

      }
      request.query(queryDataTable, async (err, result) => {
        if (err) {
          return res.error(err);
        }
        const rows = result.recordset;


        for (let i = 0; i < rows.length; i++) {

          let isGroup = rows[i].isgroup;

          if (isGroup == 'Y') {
            let sqlGetSubMenu = `SELECT mm.*
            FROM m_menu mm WHERE mm.parent_menu_id = '${rows[i].m_menu_id}'`;

            const getmenu = await request.query(sqlGetSubMenu);
            const datasubmenu = getmenu.recordset;
            rows[i].sub = datasubmenu;

          }

        }

        return res.success({
          result: rows,
          message: "Fetch data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },

  new: async function (req, res) {
    const { m_user_id, route, nama, isgroup,icon, line, parent_menu_id } = req.body;
    const id = uuid();
    var m_menu_id = id.toUpperCase();

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      if (parent_menu_id) {
        const sql = `INSERT INTO m_menu ( m_menu_id,createdby, updatedby, nama, isgroup, route,parent_menu_id, icon, line ) VALUES ('${m_menu_id}','${m_user_id}','${m_user_id}','${nama}','${isgroup}','${route}','${parent_menu_id}','${icon}','${line}')`;
        request.query(sql, (err, result) => {
          if (err) {
            return res.error(err);
          }
          return res.success({
            data: result,
            message: "Insert data successfully"
          });
        });
      }
      else {
        const sql = `INSERT INTO m_menu ( m_menu_id,createdby, updatedby, nama, isgroup, route, icon, line ) VALUES ('${m_menu_id}','${m_user_id}','${m_user_id}','${nama}','${isgroup}','${route}','${icon}','${line}')`;
        request.query(sql, (err, result) => {
          if (err) {
            return res.error(err);
          }
          return res.success({
            data: result,
            message: "Insert data successfully"
          });
        });
      }
    } catch (err) {
      return res.error(err);
    }
  },

  // UPDATE RESOURCE
  update: async function (req, res) {
    const { m_user_id, id, route, nama } = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `UPDATE m_menu SET updatedby = '${m_user_id}',
                    nama = '${nama}',
                    route = '${route}'
                   WHERE m_menu_id='${id}'`;

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
  delete: async function (req, res) {
    const { id } = req.query;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `DELETE FROM m_menu WHERE m_menu_id='${id}'`;

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
