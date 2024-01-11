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

  // DELETE RESOURCE
  getByKode: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      const sql = `SELECT kode,nama,kode_satuan,keterangan FROM r_satuan_mapping_fkr WHERE kode = '${req.param(
        "kode"
      )}'`;

      request.query(sql,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let datanya = result.recordset;

        return res.success({
          data: datanya,
          message: "Data harga"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
};
