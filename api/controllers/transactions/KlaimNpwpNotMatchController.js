/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


 module.exports = {
   // GET ALL RESOURCE


   find: async function(req, res) {
    const {
      query: { tahun, bulan }
    } = req;

    await DB.poolConnect;
    try {
      const request = DB.pool.request();


        let whereClausetahun = ``;
    
        if(tahun){
            whereClausetahun = `AND tahun = '${tahun}'`;
        }

        let whereClausebulan = ``;
        
        if(bulan){
        
            whereClausebulan = `AND bulan= '${bulan}'`;    
        
        }


        let queryDataTable = `SELECT * FROM data_npwp_klaim_not_match WHERE 1=1 ${whereClausetahun} ${whereClausebulan}
                              ORDER BY accounting_document_number`;


        request.query(queryDataTable, (err, result) => {
            if (err) {
            return res.error(err);
            }

            const rows = result.recordset;
            /**
             * {
             *    result : data utama,
             *    meta : data tambahan ( optional ),
             *    status : status response ( optional),
             *    message : pesan ( optional )
             * }
             */
            return res.send(rows);

        });
    } catch (err) {
      return res.error(err);
    }
  },
 }
 