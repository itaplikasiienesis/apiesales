/* eslint-disable no-unused-vars */
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
 const DBEMPLOYEE = require('../../../../services/DBEMPLOYEE');

 module.exports = {
   // GET ALL RESOURCE

   find: async function (req, res) {
    const {
      query: {m_user_id}
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

                            
      let queryDataTable = `SELECT DISTINCT rgm.r_group_material_id,rgm.kode,rgm.nama 
      FROM r_group_material rgm,creator_group_material_alt_supplier cgmas 
      WHERE rgm.kode = cgmas.kode_group_material AND cgmas.nip = '${m_user_id}'`;

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
}
 