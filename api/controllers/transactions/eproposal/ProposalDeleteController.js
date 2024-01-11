const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
const _ = require('lodash');
const fs = require("fs");
const path = require('path');
const glob = require("glob");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {

  delete: async function(req, res) {
    await DB.poolConnect;
    const{
        proposal_id
    } = req.body
    try {
      const request = await DBPROP.promise();

            
      // await request.query(`DELETE FROM proposal WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_email_distributor WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_executor WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_branch WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_activity WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_market WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_variant WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_distributor WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_budget WHERE proposal_id='${proposal_id}'`);
      // await request.query(`DELETE FROM proposal_file WHERE proposal_id='${proposal_id}'`);


      return res.success({
        result: proposal_id,
        message: "Delete Proposal successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  deletefile: async function(req, res) {
    await DB.poolConnect;
    const{
        uid,
        name,
        proposal_id
    } = req.body
    try {
      const request = await DBPROP.promise();
      await request.query(`DELETE FROM proposal_file WHERE proposal_file_id='${uid}' AND file='${name}' AND proposal_id=${proposal_id}`);

      //DELETE FILE FISIK
      const filesamaDir = glob.GlobSync(path.resolve(dokumentPath( 'dokumenproposal', proposal_id), name) + '*')
      if (filesamaDir.found.length > 0) {
          fs.unlinkSync(filesamaDir.found[0])
      }
      //END DELETE FILE FISIK

      return res.success({
        result: proposal_id,
        message: "Delete File Proposal successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
}