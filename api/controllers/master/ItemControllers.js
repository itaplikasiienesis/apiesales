const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");

module.exports = {
    find: async function(req, res) {
        const {
          query: { currentPage, pageSize }
        } = req;
    
        await DB.poolConnect;
        try {
          const request = DB.pool.request();
          const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
          const whereClause = req.query.filter ? `WHERE ${req.query.filter}` : "";
    
          let queryCountTable = `select count(1) from m_produk ${whereClause}`;
    
          let queryDataTable = `select count(1) from m_produk ${whereClause}
                                order by kode_sap
                                OFFSET ${offset} ROWS
                                FETCH NEXT ${limit} ROWS ONLY`;
    
          const totalItems = await request.query(queryCountTable);
          const count = totalItems.recordset[0].total_rows || 0;
    
          request.query(queryDataTable, (err, result) => {
            if (err) {
              return res.error(err);
            }
    
            const rows = result.recordset;
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
}