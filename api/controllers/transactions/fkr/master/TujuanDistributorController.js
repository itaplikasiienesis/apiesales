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
      query: { m_pajak_id }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let WherePajakId = ``;
      if(m_pajak_id){
        WherePajakId = `AND m_pajak_id = '${m_pajak_id}'`;
      }


      let queryDataTable = `SELECT * FROM m_distributor_v WHERE 1=1 ${WherePajakId}`;

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