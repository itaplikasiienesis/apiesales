/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


// const dbPostgres = require('../../services/DBENIGMA');

module.exports = {
  
    getDataSiSo: async function (req, res) {
      const {
        query: { startDate,endDate}
      } = req;

      console.log(req.query);
  
      await DB.poolConnect;
      try {

        let sqlgetData = `SELECT a.kf, to_char(a.bulan::date,'yyyy-mm-dd') AS bulan, a.region_area, 
        a.channel_head, a.brand4, sum(a.value) * 1000000 AS value,sub_channel,a.channel,channel_dist,region_area,a.district_area,a.subdist_id,a.account_coverage
        FROM siso_new a WHERE a.kf = 'Sell Out'::bpchar AND a.bulan::date BETWEEN '${startDate}'::date and '${endDate}'::date
        GROUP BY a.kf, to_char(a.bulan::date,'yyyy-mm-dd'), a.region_area, a.channel_head, a.brand4,a.sub_channel,a.channel_dist,a.channel,a.district_area,a.subdist_id,a.account_coverage`;
        console.log(sqlgetData);
        let data = await dbPostgres.query(sqlgetData);

        return res.send(data.rows);
  
      } catch (err) {
        return res.error(err);
      }
    }
  };
  