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
const otpGenerator = require('otp-generator');
module.exports = {
 

  // GET ONE RESOURCE
  find: async function(req, res) {
    const {m_user_id} = req.query;  
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let number = otpGenerator.generate(10, { upperCase: false, specialChars: false,alphabets:false });
      let insertHistoryGet = `INSERT INTO log_console_number
      (createdby, updatedby, nomor)
      VALUES('${m_user_id}', '${m_user_id}', '${number}')`;


      request.query(insertHistoryGet, (err, result) => {
        if (err) {
          return res.error(err);
        }

        return res.success({
          result: number,
          message: "Get Number successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  }
  
};

