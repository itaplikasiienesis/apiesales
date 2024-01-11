const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");

module.exports = {
    find: async function(req, res) {
        const {
          query: { tahun, bulan,week_number }
        } = req;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();

    
          let queryDataTable = `SELECT tahun,bulan,tgl FROM m_tanggal_cmo WHERE tahun=${tahun} AND bulan=${bulan} 
          AND week_number=${week_number} AND isactive='Y' ORDER BY tgl`;
    
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